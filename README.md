# FAP video

FAP Video is a tool which provides the control of the consumption of the Internet contract, specially conceived for the people who use a satellite access to the Internet.

Globally, it allows to :
* Monitor the data consumption quota
* Apply different techniques to reduce data consumption

The solution has 2 components : 
*  A Firefox plugin used as HMI (called "**Plugin**")
*  A Linux daemon (called "**Daemon**") which needs to be installed in the gateway of the local network (e.g. the router machine)

## OS supported
The Plugin can be installed on **Linux and Windows** machines.
The Daemon only supports **Debian** distributions (tested on Ubuntu 16.04, Ubuntu 20.04 and Raspbian 9.1).

## Add-on Features

You find below the complete list of features :

* Display the current consumption of the Internet access contract :
  - Amount of data consumed during the "limited data" period (data which belongs to the contract)
  - Amount of data consumed during the "unlimited data" period (free data)
* Display information about the Internet access contract :
  - Limit of data to download per month
  - Limit of data to upload per month
  - The monthly anniversary of the contract
  - The time interval corresponding to the "unlimited data" period
* Apply prevention techniques to reduce data consumption :
  - Limit the video quality
  - Block ads (integration of [uBlock Origin](https://addons.mozilla.org/es/firefox/addon/ublock-origin/))
  - Disable videos autoplay
  - Generate alert Pop-Ups when the user is going to play videos during the "limited data" period
  - Use a Firefox supported version of [WebBoost](https://chrome.google.com/webstore/detail/web-boost-wait-less-brows/ahbkhnpmoamidjgbneafjipbmdfpefad) (caching generic web elements like css, js, etc...)

## How to Install 

### Plugin part

Install latest version of Firefox and add the add-on under xpi format :

1.  Download the [fap-x.x.xpi](https://github.com/CNES/fap-video/tree/master/plugin/install) file
2.  Go to the "Add-ons" management menu
2.  Choose the option "Install Add-on from file"
3.  Select the fap-x.x.xpi file 
3.  Accept permissions


### Daemon part

You need to clone (or download) the project and run the install script : 

```
# git clone https://github.com/CNES/fap-video.git
# cd fap-video/daemon/install
# sudo ./install_daemon.sh # Add optionally IP and Port to listen to
```

The script `install_daemon.sh` will launch automatically the Daemon at the end of the install. The Daemon opens
a socket to listen to the Plugin's requests. By default, the Daemon listens to all IP addresses (0.0.0.0) and port 8123.
You can change that network configuration by adding the IP and the Port. In the following example, the Daemon
will only listen to the IP 192.168.1.1 and the Port 6389:

```
# sudo ./install_daemon.sh 192.168.1.1 6389 
```

The Daemon is launched as a systemd service unit named `fap_daemon`, so you can manage it with "systemctl" tool.
The service takes the IP address and the port as mandatory arguments with the following syntax:
**fap_daemon@< ip_addr >:< port >.service**

## Configuration

1.  Open the plugin HMI and go to "Daemon Settings"
2.  Put the IP address and te Port of the machine hosting the Daemon (according to the Daemon's installation process)
3.  Click on "Apply"
4.  Get the characteristics of your contract (contact your service provider if you don't know how to get them)
5.  Go to "Contractual Settings" from the main page of the plugin
6.  Enter the contract characteristics and click on "Apply"
7.  Optionally, you can adjust the current quota consumption in the section "Contractual Quota Settings" and click on "Apply"

All this information (contract settings and data consumption) is stored locally in the Daemon machine and it is recovered during a potential reboot.

## Plugin’s build instructions (for developers)
Clone (or download) the project and run the build script :

```
# git clone https://github.com/CNES/fap-video.git
# cd fap-video/plugin/src/
# ./tools/make.sh
```

The results of the build will be available in ```fap-video/plugin/src/build/```
