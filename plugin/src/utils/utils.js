//
// Copyright (c) Viveris Technologies.
// Licensed under the MIT license. See LICENSE file in the project root for details.
//

/* Get URL to connect to the Daemon */
function getDaemonUrl(object, path) {
  try {
    // Get Daemon IP and Port
    var ip = object.daemonIp;
    var port = object.daemonPort;
  } catch (ex) {
    if (!ex instanceof TypeError) {
      throw ex;
    }
  }
  if (!ip || !port) {
    return '';
  }
  return ''.concat('http://', ip, ':', port,'/', path);
}

