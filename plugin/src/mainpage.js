//
// Copyright (c) Viveris Technologies.
// Licensed under the MIT license. See LICENSE file in the project root for details.
//


/* Format number used as dates */
function formatNumber(number) {
  if (number < 10){
    number = "0" + number;
  }
  return number;
}


/* Convert a statistic to the 'best human readable' unit */
function statWithUnit(value) {
  var unit = 'b';
  if (value/1000000000 > 1) {
    value = value/1000000000;
    unit = 'Gb';
  } else if (value/1000000 > 1) {
    value = value/1000000;
    unit = 'Mb';
  } else if (value/1000 > 1) {
    value = value/1000;
    unit = 'Kb';
  }
  if (value == 0) {
    unit = '';
  }
  value = value.toFixed(1);
  return value.toString().concat(' ',unit);
}


/* Update the display of the values of the consumption statistics */
function updateStats(stats) {
  var elements = document.getElementsByClassName('stat-value');
  for (var i = 0; i < elements.length; i++){
    var id = elements[i].id;
    var content = statWithUnit(stats[id]);
    if (id == 'unlimDataDl') {
      var percentage = Math.trunc(parseInt(stats[id],10) / parseInt(stats['totalDataDl']) * 100);
      content = content.concat('   ( ', percentage, ' % )');

    } else if (id == 'unlimDataUl') {
      var percentage = Math.trunc(parseInt(stats[id],10) / parseInt(stats['totalDataUl']) * 100);
      content = content.concat('   ( ', percentage, ' % )');
    }      
    elements[i].textContent = content;
  }
}


/* Retrieve the consumptions statistics from the Daemon  */
function getConsumptionStats() {
  var gettingDaemonSettings = browser.storage.local.get('daemonSettings');
  gettingDaemonSettings.then(result =>{
    var url = getDaemonUrl(result.daemonSettings, 'consumption-stats')
    if (!url) {
      // Cannot get stats from the Daemon
      displayWarningMessage();
      return;
    }
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.send();
    xhr.onreadystatechange = function(){
      if(xhr.readyState === 4 && xhr.status === 200){
        var jsonStats = JSON.parse(xhr.responseText);
        // Update the consumption stats in mainpage
        updateStats(jsonStats);
      }
    };
  });
  setTimeout(getConsumptionStats,1000);
}


/* Calculate the next renewal day according to the contract information */
function getNextRenewalDate(renewalDay) {
  var today = new Date();
  var currentDay = today.getDate();
  if (currentDay <= renewalDay) {
    var renewalMonth = formatNumber(today.getMonth() + 1); // Renewal on current month (Month ID starts at 0)
  } else {
    var renewalMonth = formatNumber(today.getMonth() + 2); // Renewal on next month (Month ID starts at 0)
  }
  return ''.concat(formatNumber(renewalDay), '/', renewalMonth);
}


/* Update the display of the contract information */
function updateContractInfo(info) {
  if (info['monthlyRenewalDay']){
    var nextRenewalElement = document.getElementById('nextRenewal');
    var renewalDate = getNextRenewalDate(parseInt(info['monthlyRenewalDay'], 10));
    nextRenewalElement.textContent = ''.concat('Renewal : ', renewalDate);
  }
  if (info['unlimStartTime'] && info['unlimEndTime']){
    var unlimPeriodElement = document.getElementById('unlimPeriod');
    unlimPeriodElement.textContent = ''.concat(info['unlimStartTime'], ' - ', info['unlimEndTime']);
  }
  if (info['limitDataDl']) {
    var limitDataDlElement = document.getElementById('limitDataDl');
    limitDataDlElement.textContent = ''.concat(' / ', info['limitDataDl'], ' Gb');
  }
  if (info['limitDataUl']) {
    var limitDataUlElement = document.getElementById('limitDataUl');
    limitDataUlElement.textContent = ''.concat(' / ', info['limitDataUl'], ' Gb');
  }
}


function displayWarningMessage() {
  var warningElement = document.getElementsByClassName('warningDaemon')[0];
  warningElement.style.display='block';
}


/* Remind some pragmatical information about the contract */
function displayContractInfo() {
  // Get Daemon IP and Port from browser storage 
  var gettingDaemonSettings = browser.storage.local.get('daemonSettings');
  gettingDaemonSettings.then(result =>{
    var url = getDaemonUrl(result.daemonSettings, 'contractual-settings');
    if (!url) {
      // Daemon IP and Port have not been set
      displayWarningMessage();
      return;
    }
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.send();
    xhr.onreadystatechange = function(){
      if(xhr.readyState === 4) {
        if (xhr.status === 200) {
          // Display the contract information in the input fields
          var jsonStats = JSON.parse(xhr.responseText);
          updateContractInfo(jsonStats);
        }
        else if (xhr.status === 0) {
          // HTTP request send failed
          displayWarningMessage();
        }
      }
    };
  });
}


/* Apply limitation of video quality */
function applyQualityLimit(){
  var qualityLimit = this.value;
  //Send the application request to the daemon
  var gettingDaemonSettings = browser.storage.local.get('daemonSettings');
  gettingDaemonSettings.then(result =>{
    var url = getDaemonUrl(result.daemonSettings, 'quality-limitation');
    if (!url) {
      // Daemon IP and Port have not been set
      accept = confirm("You need to setup the Daemon connectivity to apply video quality limitation.\nThe parameter has not been taken into account.");
      if (!accept){
        return;
      }
    }
    var xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);
    xhr.setRequestHeader("Content-Type", "application/json");
    var data = JSON.stringify({"maxQuality": qualityLimit});
    xhr.send(data);
    xhr.onreadystatechange = function(){
      if(xhr.readyState === 4 && xhr.status === 0) {
        // HTTP request send failed
        accept = confirm("You need to setup the Daemon connectivity to apply video quality limitation.\nThe parameter has not been taken into account.");
        if (!accept){
          return;
        }
      }
    };
  });
}


/* Get current video quality limitation */
function displayCurrentQualityLimit() {
  // Get Daemon IP and Port from browser storage 
  var gettingDaemonSettings = browser.storage.local.get('daemonSettings');
  gettingDaemonSettings.then(result =>{
    var url = getDaemonUrl(result.daemonSettings, 'quality-limitation');
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
        // Display the current video quality limitation in the list selector
        var limitQualityInput = document.getElementById('limitQuality');
        limitQualityInput.value = jsonStats['maxQuality'];
      }
    };
  });
}


/* Display current state of a given feature through the switch button */
function displayFeatureState(sw, feature) {
  // Get current state from the browse storage 
  var gettingFeatureState = browser.storage.local.get(feature);
  gettingFeatureState.then(result =>{
    if (Object.keys(result).length == 0){
      return;
    }
    sw.checked = result[feature];
  });
}


/* Update state of particular features in the local browser storage */
function updateFeature(feature) {
  results = new Object();
  results[feature] = this.checked;
  browser.storage.local.set(results);
}


function goToContractualSettings() {
  window.location.href = 'contractual_settings.html';
}


function goToDaemonSettings() {
  window.location.href = 'daemon_settings.html';
}


var goToContractualSettingsButton = document.getElementById('contractualSettingsButton');
goToContractualSettingsButton.addEventListener('click', goToContractualSettings, false);

var goToDaemonSettingsButton = document.getElementById('daemonSettingsButton');
goToDaemonSettingsButton.addEventListener('click', goToDaemonSettings, false);

var limitQualityInput = document.getElementById('limitQuality');
limitQualityInput.addEventListener("change", applyQualityLimit, false);

var reminderSwitch = document.getElementById('reminderSwitch');
reminderSwitch.addEventListener('change', updateFeature.bind(reminderSwitch,'reminderState'), false);

var blockVideosSwitch = document.getElementById('blockVideosSwitch');
blockVideosSwitch.addEventListener('change', updateFeature.bind(blockVideosSwitch, 'blockVideosState'), false);

displayFeatureState(reminderSwitch, 'reminderState');
displayFeatureState(blockVideosSwitch, 'blockVideosState');
displayContractInfo();
displayCurrentQualityLimit();
getConsumptionStats();

