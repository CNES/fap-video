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
import subprocess


HANDLE_INGRESS = 'ffff:'
IFB = 'ifb0'


def run_command(cmd):
    """ Run a command, return return code """
    p = subprocess.run(cmd, stderr=subprocess.PIPE, stdout=subprocess.PIPE)
    if p.returncode:
        message = "Error when executing command '{}': '{}'".format(
                    ' '.join(cmd), p.stderr.decode())
        #exit(message)
    return p.stdout.decode()


def clear_conf(interface):
    # Find ifbs that are associated to interface
    cmd = ['tc', 'filter', 'show', 'dev', interface, 'parent', HANDLE_INGRESS]
    output = run_command(cmd)
    ifbs = re.findall('Egress Redirect to device (\w+)', output)
    # Remove filter rule redirecting all incoming traffics from interface to ifb interface
    cmd = ['tc', 'filter', 'del', 'dev', interface, 'parent', HANDLE_INGRESS]
    # Check if an ingress qdisc exists, if so remove it on interface
    cmd = ['tc', 'qdisc', 'show', 'dev', interface, 'ingress']
    output = run_command(cmd)
    ingress_qdiscs = re.findall('qdisc ingress', output)
    if ingress_qdiscs: 
       delete_qdisc(interface, 'ingress')
    # Remove qdisc root on ifbs and set them down
    for ifb in ifbs:
        delete_qdisc(ifb, 'root')
        cmd = ['ip', 'link', 'set', 'dev', ifb, 'down']
        output = run_command(cmd)
    # Check if ifb module is not using, if so remove it
    cmd = ['tc', 'qdisc', 'show']
    output = run_command(cmd)
    ingress_qdiscs = re.findall('qdisc ingress', output)
    if not ingress_qdiscs: 
       cmd = ['modprobe', '-r', 'ifb']
       run_command(cmd)


def delete_qdisc(interface, qdisc):
    """ Delete the tc qdisc on an interface """
    cmd = ['tc', 'qdisc', 'del', 'dev', interface, qdisc]
    run_command(cmd)


def add_qdisc_ingress(interface, ifb, buffer_size):
    cmds = [
            [
                'ip', 'link', 'set', 'dev', ifb, 'up', 'qlen', str(buffer_size)
            ],
            [
                'tc', 'qdisc', 'add', 'dev', interface, 'handle', HANDLE_INGRESS, 'ingress'
            ], 
            [
                'tc', 'filter', 'add', 'dev', interface, 'parent', HANDLE_INGRESS, 'u32', 'match', 'u32', '0', '0', 
                      'action', 'mirred', 'egress', 'redirect', 'dev', ifb
            ]
           ]
    for cmd in cmds:
        run_command(cmd)


def add_qdisc_bandwidth(interface, bandwidth):
    """ Add a qdisc to limit the bandwidth on interface """
    cmds = [[
                'tc', 'qdisc', 'add', 'dev', interface, 'root',
                'handle', '1:', 'htb', 'default', '11'
            ],[
                'tc', 'class', 'add', 'dev', interface, 'parent',
                '1:', 'classid', '1:1', 'htb', 'rate', '{}bps'.format(bandwidth),
                'burst', '1000b'
            ],[
                'tc', 'class', 'add', 'dev', interface, 'parent',
                '1:1', 'classid', '1:11', 'htb', 'rate', '{}bit'.format(bandwidth),
                'burst', '1000b'
            ]]
    for cmd in cmds:
        run_command(cmd)


def apply_conf(interface, bandwidth, buffer_size=10000):
    clear_conf(interface)
    run_command(['modprobe', '-r', 'ifb'])
    run_command(['modprobe', 'ifb', 'numifbs=1'])
    # Clear ingress configuration and add a new one
    add_qdisc_ingress(interface, IFB, buffer_size)
    if not re.findall(r'^[0-9]+[KM]$', bandwidth):
        message = "Invalid format for bandwidth: expecting '{}', found '{}'".format('{VALUE}{M|K}', bandwidth)
        sys.exit(message)
    add_qdisc_bandwidth(IFB, bandwidth)
        
