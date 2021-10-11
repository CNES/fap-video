//
// Copyright (c) Viveris Technologies.
// Licensed under the MIT license. See LICENSE file in the project root for details.
//


/* Put the current values of the contract in the page */
function displayContractInfo(info) {
  var elements = document.getElementsByClassName('contract-info');
  for (var i = 0; i < elements.length; i++){
    var id = elements[i].id;
    elements[i].value = info[id];
  }
}


/* Apply contractual settings */
function applySettings() {
  var message = document.getElementById("resultContractMessage");
  message.textContent = "Sending contract information to the Daemon...";
  var dataObjects = {};
  var elements = document.forms["contractSettings"].elements;
  for (var i = 0; i < elements.length; i++){
    var id = elements[i].id;
    var value = elements[i].value;
    dataObjects[id] = value;
  }
  var gettingDaemonSettings = browser.storage.local.get('daemonSettings');
  gettingDaemonSettings.then(result =>{
    var url = getDaemonUrl(result.daemonSettings, 'contractual-settings');
    if (!url) {
      // Daemon IP and Port have not been set
      message.textContent = "Failed to connect to the Daemon (Daemon settings not defined)";
      message.style.color = "#FF6347";
      return;
    }
    var xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);
    xhr.setRequestHeader("Content-Type", "application/json");
    var data = JSON.stringify(dataObjects);
    xhr.send(data);
    xhr.onreadystatechange = function(){
      if(xhr.readyState === 4) {
        if (xhr.status === 200) {
          message.textContent = "Contract sent to the Daemon successfully !";
          message.style.color = "#73AB6B";
        }
        else if (xhr.status === 0){
          // HTTP request send failed
          message.textContent = "Failed to connect to the Daemon";
          message.style.color = "#FF6347";
        }
      }
    };
  });
}


/* Force the current quota manually */
function applyQuota() {
  var message = document.getElementById("resultQuotaMessage");
  message.textContent = "Sending quota to the Daemon...";
  var dataObjects = {};
  var elements = document.forms["quotaSettings"].elements;
  for (var i = 0; i < elements.length; i++){
    var id = elements[i].id;
    var value = elements[i].value * 1000000000;
    dataObjects[id] = value;
  }
  var gettingDaemonSettings = browser.storage.local.get('daemonSettings');
  gettingDaemonSettings.then(result =>{
    var url = getDaemonUrl(result.daemonSettings, 'consumption-stats');
    if (!url) { 
      // Daemon IP and Port have not been set
      message.textContent = "Failed to connect to Daemon (Daemon settings not defined)";
      message.style.color = "#FF6347";
      return;
    }
    var xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);
    xhr.setRequestHeader("Content-Type", "application/json");
    var data = JSON.stringify(dataObjects);
    xhr.send(data);
    xhr.onreadystatechange = function(){
      if(xhr.readyState === 4) {
        if (xhr.status === 200) {
          message.textContent = "Quota has been set successfully !";
          message.style.color = "#73AB6B";
        }
        else if (xhr.status === 0){
          // HTTP request send failed
          message.textContent = "Failed to connect to the Daemon";
          message.style.color = "#FF6347";
        }
      }
    };
  });
}


/* Get current configuration of the contract */
function displayCurrentConf() {
  // Get Daemon IP and Port from browser storage 
  var gettingDaemonSettings = browser.storage.local.get('daemonSettings');
  gettingDaemonSettings.then(result =>{
    var url = getDaemonUrl(result.daemonSettings, 'contractual-settings');
    if (!url) {
      // Daemon IP and Port have not been set
      return;
    }
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.send();
    xhr.onreadystatechange = function(){
      if(xhr.readyState === 4 && xhr.status === 200){
        var jsonStats = JSON.parse(xhr.responseText);
        // Display the contract information in the input fields
        displayContractInfo(jsonStats);
      }
    };
  });
}


function goToMainPage() {
  window.location.href = "mainpage.html";
}


var applySettingsButton = document.getElementById("applyContractualSettingsButton");
applySettingsButton.addEventListener("click", applySettings, false);

var applyQuotaButton = document.getElementById("applyManualQuotaButton");
applyQuotaButton.addEventListener("click", applyQuota, false);

var goToMainPageButton = document.getElementById("goToMainPageButton");
goToMainPageButton.addEventListener("click", goToMainPage, false);

displayCurrentConf();

