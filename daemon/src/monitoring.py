#!/usr/bin/env python3

#
# Copyright (c) Viveris Technologies.
# Licensed under the MIT license. See LICENSE file in the project root for details.
#


__author__ = 'Viveris Technologies'
__credits__ = '''Contributors:
 * David FERNANDES <david.fernandes@viveris.fr>
'''

import re
import sys
import time
import json
import subprocess
from datetime import datetime

import iptc
from crontab import CronTab
from apscheduler.schedulers.blocking import BlockingScheduler

GRANULARITY = 1
DATA_FILE = '/opt/fap/daemon_data.json'
PERIODS = ('limited', 'unlimited')
DIRECTIONS = ('download', 'upload')


def get_wan_interface():
    # Idea : get the interface that would be used to contact Google DNS
    cmd = ['ip', 'route', 'get', '8.8.8.8']
    route = subprocess.run(cmd, stdout=subprocess.PIPE)
    match = re.search(r'dev \b(\w+)\b', route.stdout.decode())
    if match is None:
        sys.exit('ERROR : cannot identify the WAN interface')

    return match.groups()[0]


class Monitoring(object):

    def __init__(self):
        self.data = dict()
        self.contract_settings = dict() # Manage granularity, counting, alerting and broadcasting settings
        self.wan_interface = get_wan_interface()
        self._table = None
        self._chain = None
        self._rules = dict()
        self._shutdown = False
        self._scheduler = None
        self._job = None
        # Attributes to manage the interval data counting
        self._base = dict()
        self._extra = dict()
        self._state = 'limited'
        self._init_iptables('FORWARD')
        self._init_dicts()

    # Helper method : initialize iptables objects
    def _init_iptables(self, chain):
        self._table = iptc.Table(iptc.Table.FILTER)
        self._chain = iptc.Chain(self._table, chain)

    # Helper method : initialize attributes
    def _init_dicts(self, keep_settings=False):
        if not keep_settings:
            self.contract_settings['unlimited_period'] = {'start_time': None, 'end_time': None}
            self.contract_settings['anniversary'] = None
            self.contract_settings['upload_limit'] = None
            self.contract_settings['download_limit'] = None

        self.data['total'] = dict()
        for period in PERIODS:
            self._base[period] = dict()
            self._extra[period] = dict()
            self.data[period] = dict()
            for direction in DIRECTIONS:
                self._base[period][direction] = 0
                self._extra[period][direction] = 0
                self.data[period][direction] = 0

    # Helper method : create iptables rules
    def _create_rules(self):
        for direction in DIRECTIONS:
            # Creation of the Rule
            self._rules[direction] = iptc.Rule(chain=self._chain)
            # Add the Target
            self._rules[direction].create_target('')
            if direction == 'download':
                self._rules[direction].set_in_interface(self.wan_interface)
            elif direction == 'upload':
                self._rules[direction].set_out_interface(self.wan_interface)
            self._chain.insert_rule(self._rules[direction])
        print('Added iptables rules for monitoring')

    # Helper method : delete iptables rules
    def _delete_rules(self):
        for direction in DIRECTIONS:
            self._chain.delete_rule(self._rules[direction])

    # Helper method : reset packet counters of iptables rules 
    def _reset_iptables_counters(self):
        self._chain.zero_counters()

    # Helper metohod : update dicts which manage the consumption statistics
    def _update_data(self, period, bits_count, update_base=False):
        for direction in DIRECTIONS:
            self._extra[period][direction] = bits_count[direction]
            self.data[period][direction] = self._extra[period][direction] + self._base[period][direction]
            self.data['total'][direction] = self.data['limited'][direction] + self.data['unlimited'][direction]
            if update_base:
                self._base[period][direction] += self._extra[period][direction]

    # Returns True if we are currently in 'unlimited' data period
    def is_unlimited(self):
        unlimited_start = self.contract_settings['unlimited_period']['start_time']
        unlimited_end = self.contract_settings['unlimited_period']['end_time']
        if not unlimited_start or not unlimited_end:
             return False
        now = datetime.now().time()
        unlimited_start = datetime.strptime(unlimited_start, '%H:%M').time()
        unlimited_end = datetime.strptime(unlimited_end, '%H:%M').time()
        if (unlimited_start <= unlimited_end):
            return unlimited_start <= now <= unlimited_end
        else:
            return unlimited_start <= now or now <= unlimited_end

    # Stop monitoring
    def stop(self):
        if self._job is not None:
            self.del_cron_job()
        self._shutdown = True

    # Reset the data consumption statistics
    def clear_traffic_stats(self):
        self._reset_iptables_counters()
        self._init_dicts(keep_settings=True)

    # Set manually the value of data consumption statistics
    def set_quota(self, download, upload):
        self.clear_traffic_stats()
        self._base['limited']['download'] = download
        self._base['limited']['upload'] = upload

    # Add a cron task which resets the stats every day <day> of the month 
    def add_cron_job(self, day, daemon_port):
        cron = CronTab(user=True)
        command = ('curl -X PUT -H "Content-Type: application/json" '
                  '-d \'{{\"updateQuotaDl\": 0, \"updateQuotaUl\": 0}}\' '
                  'http://127.0.0.1:{}/consumption-stats'.format(daemon_port))
        comment = 'Reset Daemon statistics'
        if self._job is None:
            self._job = cron.new(command=command, comment=comment)
        else:
            jobs_iter = cron.find_comment(comment)
            self._job = next(jobs_iter)
        self._job.day.on(day)
        self._job.hour.on(0)
        self._job.minute.on(0)
        cron.write()

    # Delete cron task which resets the stats avery month
    def del_cron_job(self):
        cron = CronTab(user=True)
        cron.remove(self._job)
        cron.write()

    # Store current contract info and data consumption in a file
    def store_conf(self):
        data = dict()
        data['consumption_statistics'] = self.data
        data['contract_settings'] = self.contract_settings
        with open(DATA_FILE, 'w') as datafile:
                json.dump(data, datafile)

    # Load last contract info and data consumption to recover after potential shutdown
    def load_conf(self):
        try:
            with open(DATA_FILE) as datafile:
                data = json.load(datafile)
                self._base = data['consumption_statistics']
                self._update_data('limited', self._extra['limited'])
                self._update_data('unlimited', self._extra['unlimited'])
                self.contract_settings = data['contract_settings']
        except (FileNotFoundError, json.decoder.JSONDecodeError):
            return False
        else:
            self._state = 'unlimited' if self.is_unlimited() else 'limited'
            return True

    def get_current_period(self):
        return self._state

    def monitor(self):
        if self._shutdown:
            self._scheduler.shutdown(wait=False)
            return

        # Store current state in the json file
        self.store_conf()

        bits_count = dict()
        # Refresh the table to get the current stats
        self._table.refresh()

        # Get the rules (Attention, the rules shall be in first position)
        self._rules['upload'] = self._chain.rules[0]
        self._rules['download'] = self._chain.rules[1]

        # Get the stats
        for direction in DIRECTIONS:
            bits_count[direction] = self._rules[direction].get_counters()[1] * 8
    
        # Check the current data period
        if self.is_unlimited():  # We are in 'unlimited' time interval
            if self._state == 'unlimited':  # It was in unlimited mode already
                # Add value to the current unlimited data counter
                self._update_data('unlimited', bits_count)
                return

            # Switch from 'limited' to 'unlimited'
            self._update_data('limited', bits_count, update_base=True)
            self._state = 'unlimited'
            self._reset_iptables_counters()
            return

        # Switch from 'unlimited' to 'limited'
        if self._state == 'unlimited':
            self._update_data('unlimited', bits_count, update_base=True)
            self._state = 'limited'
            self._reset_iptables_counters()
            return

        # Add value to the current limited data counter
        self._update_data('limited', bits_count)

    # Start monitoring
    def start(self):
        if self.load_conf():
            print('Last configuration loaded')
        print('Starting monitoring of data consumption')
        # Create the rules
        self._create_rules()
        # Monitoring
        self._scheduler = BlockingScheduler()
        self._scheduler.add_job(
                self.monitor, 'interval',
                seconds=GRANULARITY, id='monitoring')
        self._scheduler.start()
        # Delete the rules
        self._delete_rules()

