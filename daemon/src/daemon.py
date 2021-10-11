#!/usr/bin/env python3

#
# Copyright (c) Viveris Technologies.
# Licensed under the MIT license. See LICENSE file in the project root for details.
#

__author__ = 'Viveris Technologies'
__credits__ = '''Contributors:
 * David FERNANDES <david.fernandes@viveris.fr>
'''

import json
import signal
import socket
import argparse
import urllib.parse
from threading import Thread
from functools import partial
from http.server import HTTPServer, BaseHTTPRequestHandler

import traffic_control as tc
import monitoring


def signal_handler(daemon, signal, frame):
    daemon.stop()
    print('Daemon stopped')


# Get string representation of JS boolean
def get_js_bool(boolean):
    if boolean:
        return 'true'
    else:
        return 'false'


class HttpHandler(BaseHTTPRequestHandler):
    # Access to the daemon
    daemon = None

    # Helper method to set status code and common headers
    def set_status_and_headers(self, code):
        # Set response code
        self.send_response(code)
        # Set response headers
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()

    # Helper method to get body of request
    def get_body(self):
        content_length = int(self.headers['Content-Length'])
        body = self.rfile.read(content_length).decode()
        return body

    # Handler for GET requests
    def do_GET(self):
        # Check URL Path
        if self.path == '/consumption-stats':
            self.set_status_and_headers(200)
            self.wfile.write(json.dumps({
                'consumDataDl': HttpHandler.daemon.monitor.data['limited']['download'],
                'consumDataUl': HttpHandler.daemon.monitor.data['limited']['upload'],
                'unlimDataDl': HttpHandler.daemon.monitor.data['unlimited']['download'],
                'unlimDataUl': HttpHandler.daemon.monitor.data['unlimited']['upload'],
                'totalDataDl': HttpHandler.daemon.monitor.data['total']['download'],
                'totalDataUl': HttpHandler.daemon.monitor.data['total']['upload']
            }).encode())
        elif self.path == '/daemon-settings':
            self.set_status_and_headers(200)
        elif self.path == '/contractual-settings':
            self.set_status_and_headers(200)
            self.wfile.write(json.dumps({
                'monthlyRenewalDay': HttpHandler.daemon.monitor.contract_settings['anniversary'],
                'limitDataDl': HttpHandler.daemon.monitor.contract_settings['download_limit'],
                'limitDataUl': HttpHandler.daemon.monitor.contract_settings['upload_limit'],
                'unlimStartTime': HttpHandler.daemon.monitor.contract_settings['unlimited_period']['start_time'],
                'unlimEndTime': HttpHandler.daemon.monitor.contract_settings['unlimited_period']['end_time'],
                'currentPeriod': HttpHandler.daemon.monitor.get_current_period()
            }).encode())
        elif self.path == '/quality-limitation':
            self.set_status_and_headers(200)
            quality = HttpHandler.daemon.max_quality
            if quality is None:
                quality = 'No Limit'
            self.wfile.write(json.dumps({'maxQuality': quality}).encode())
        else:
            print('Error : Invalid URL path.')
            self.set_status_and_headers(404)
            return

    # Handler for PUT requests
    def do_PUT(self):
        # Get body and parse as JSON
        body = self.get_body()
        data = json.loads(body)
        # Check URL Path
        if self.path == '/consumption-stats':
            download = int(data["updateQuotaDl"])
            upload = int(data["updateQuotaUl"])
            HttpHandler.daemon.monitor.set_quota(download, upload)
        elif self.path == '/daemon-settings':
            # Potential future evolution :
            # Store the new settings and restart the Dameon with its new configuration
            print('Daemon settings push request. This feature has not been developped so far')
        elif self.path == '/contractual-settings':
            HttpHandler.daemon.monitor.contract_settings['anniversary'] = data['monthlyRenewalDay']
            HttpHandler.daemon.monitor.contract_settings['download_limit'] = data['limitDataDl']
            HttpHandler.daemon.monitor.contract_settings['upload_limit'] = data['limitDataUl']
            HttpHandler.daemon.monitor.contract_settings['unlimited_period']['start_time'] = data['unlimStartTime']
            HttpHandler.daemon.monitor.contract_settings['unlimited_period']['end_time'] = data['unlimEndTime']
            if data['monthlyRenewalDay'] :
                daemon_port = HttpHandler.daemon.server.server_address[1]
                HttpHandler.daemon.monitor.add_cron_job(int(data['monthlyRenewalDay']), daemon_port)
        elif self.path == '/quality-limitation':
            if not data['maxQuality']:
                quality = None
                tc.clear_conf(HttpHandler.daemon.monitor.wan_interface)
            else:
                quality = data['maxQuality']
                tc.apply_conf(HttpHandler.daemon.monitor.wan_interface, '{}K'.format(quality))
            HttpHandler.daemon.max_quality = quality
        else:
            print('Error : Invalid URL path.')
            self.set_status_and_headers(404)
            return

        self.set_status_and_headers(200)

    # Handler for OPTIONS requests
    # Necessary due to CORS issues
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET,PUT')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type,Accept,Origin')
        self.send_header('Access-Control-Max-Age', '3600')
        self.end_headers()


class Daemon(object):

    def __init__(self, ip, port):
        self.monitor = monitoring.Monitoring()
        self.monitor_t = Thread(target=self.monitor.start)
        self.server = None
        self.server_t = None
        self.max_quality = None # Limitation of the video quality
        self._init_server(ip, port)

    def _init_server(self, ip, port):
        self.server = HTTPServer((ip, port), HttpHandler)
        HttpHandler.daemon = self
        self.server_t = Thread(target=self.server.serve_forever)

    def run(self):
        self.monitor_t.start()
        self.server_t.start()

    def stop(self):
        self.monitor.stop()
        self.server.shutdown()
        self.server.socket.close()
        self.monitor_t.join()
        self.server_t.join()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.ArgumentDefaultsHelpFormatter)
    parser.add_argument(
            'ip_port', type=str, default='0.0.0.0:8123',
            help='IP address and Port to listen to plugin requests. Format: <address>:<port>')
    args = parser.parse_args()
    ip, port = args.ip_port.split(':')

    # Create the Daemon which calculates consumption statistics
    daemon = Daemon(ip, int(port))

    # Start the Daemon
    daemon.run()
    signal.signal(signal.SIGTERM, partial(signal_handler, daemon))
    signal.signal(signal.SIGINT, partial(signal_handler, daemon))

