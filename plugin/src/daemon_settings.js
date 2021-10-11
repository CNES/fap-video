//
// Copyright (c) Viveris Technologies.
// Licensed under the MIT license. See LICENSE file in the project root for details.
//

/* Try to connect to the Daemon and apply daemon settings in the local storage */
function applySettings() {
  var message = document.getElementById("resultMessage");
  var dataObjects = {};
  var elements = document.forms["daemonSettings"].elements;
  for (var i = 0; i < elements.length; i++){
    var id = elements[i].id;
    var value = elements[i].value;
    dataObjects[id] = value;
  }
  var xhr = new XMLHttpRequest();
  var url = getDaemonUrl(dataObjects, "daemon-settings");
  if (!url) {
    message.textContent = "You must fill IP and Port values";
    message.style.color = "#FF6347";
    return;
  }
  message.textContent = "Trying to connect to Daemon...";
  message.style.color = "#C8C8C8";
  xhr.open("GET", url, true);
  xhr.setRequestHeader("Content-Type", "application/json");
  var data = JSON.stringify(dataObjects);
  xhr.send(data);
  xhr.onreadystatechange = function(){
    if(xhr.readyState === 4) {
      if (xhr.status === 200) {
        // Store the daemon settings in Firefox local storage
        results = {"daemonSettings": dataObjects};
        browser.storage.local.set(results);
        message.textContent = "Connected to Daemon successfully !";
        message.style.color = "#73AB6B";
      }
      else if (xhr.status === 0){
        // HTTP request send failed
        message.textContent = "Failed to connect to Daemon";
        message.style.color = "#FF6347";
      }
    }
  };
}


/* Get current Daemon settings and display them in the HTML inputs */
function displayCurrentConf() {
  var gettingDaemonSettings = browser.storage.local.get("daemonSettings");
  gettingDaemonSettings.then(result =>{
    try {
      var ip = result.daemonSettings.daemonIp;
      var port = result.daemonSettings.daemonPort;
      document.getElementById("daemonIp").value = ip;
      document.getElementById("daemonPort").value = port;
    } catch (ex) {
      if (!ex instanceof TypeError) {
        throw ex;
      }
    }
  });
}


function goToMainPage() {
  window.location.href = "mainpage.html";
}


var applySettingsButton = document.getElementById("applyDaemonSettingsButton");
applySettingsButton.addEventListener("click", applySettings, false);

var goToMainPageButton = document.getElementById("goToMainPageButton");
goToMainPageButton.addEventListener("click", goToMainPage, false);

displayCurrentConf();

