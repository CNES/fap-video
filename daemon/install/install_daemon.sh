#!/bin/bash

if [[ $UID != 0 ]]; then
    echo "Please, run this script with sudo:"
    echo "sudo $0 $*"
    exit 1
fi

usage() {
    echo "Usage: sudo $0 -i ip_address -p port"
    echo "Default values if arguments are not set :"
    echo "IP : 0.0.0.0"
    echo "Port : 81230"
}

if [ $# -gt 2 ]; then
    usage
    exit 1
elif [ $# -eq 1 ]; then
    if [ $1 = "-h" ] || [ $1 = "--help" ]; then
        usage
        exit 1
    fi
fi

# Default parameters
IP=${1:-0.0.0.0}
PORT=${2:-8123}

DIRECTORY=/opt/fap/

echo "Installing dependencies..."

apt -qqq update
apt -qqq install python3-pip --yes
pip3 install -qq -U "pip<21.0"
pip3 install -qq --upgrade python-iptables apscheduler python-crontab

echo "Installing FAP Daemon..."

mkdir -p $DIRECTORY
cp ../src/daemon.py $DIRECTORY
cp ../src/monitoring.py $DIRECTORY
cp ../src/traffic_control.py $DIRECTORY
cp uninstall_daemon.sh $DIRECTORY
cp system/fap_daemon@.service /etc/systemd/system/

echo "Starting FAP Daemon Service 'fap_daemon@$IP:$PORT.service'..."
systemctl -q enable fap_daemon@$IP:$PORT.service
systemctl start fap_daemon@$IP:$PORT.service

echo "Done"

