#!/bin/bash

if [[ $UID != 0 ]]; then
    echo "Please, run this script with sudo:"
    echo "sudo $0 $*"
    exit 1
fi

DIRECTORY=/opt/fap/

echo "Stopping FAP Daemon..."
systemctl stop fap_daemon@*.service
systemctl -q disable fap_daemon@*.service

echo "Uninstalling FAP Daemon..."
rm /etc/systemd/system/fap_daemon@.service
rm /etc/systemd/system/multi-user.target.wants/fap_daemon@*.service
systemctl daemon-reload
rm -rf $DIRECTORY

echo "Done"
