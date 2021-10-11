//
// Copyright (c) Alexander Vykhodtsev and Viveris Technologies.
// Licensed under the MIT license. See LICENSE file in the project root for details.
//

/*************************************************/
/**************** Pop-Up Feature *****************/
/*************************************************/

var popupBody = '<div>This website contains videos which could quickly spent your internet quota. Are you sure to continue ?</div>' +
          '<br/>'+
          '<div><span style="color: rgb(255, 215, 0)">You could watch this content during the unlimited data period (<unlimPeriod>) '+
          'or apply the following features </span>in the plugin mainpage to reduce data consumption :</div>' +
          '<br/>'+
          '<ul style="margin-left: 5%;">' +
          '<li>Block automatic videos</li>' +
          '<li>Block ads</li>' +
          '<li>Limit video quality</li>' +
          '<li>Enable Web Boost</li>'+
          '</ul>'+
          '<div style="position: absolute; bottom: 0; right: 0;">'+
          '<input type="checkbox" id="disablePopup" name="disablePopup">'+
          '<label for="disablePopup">Do not show this message again</label>';

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

/* Update reminder state in the local browser storage */
function updateReminder() {
  var disablePopupElement = document.getElementById('disablePopup');
  if (disablePopupElement.checked){
    results = {'reminderState': !disablePopupElement.checked};
    browser.storage.local.set(results);
  }
}

/* Display Pop-Up remainding the available features */
function displayPopup(body) {
  var popupConf = {
       title: 'FAP Features Reminder',
       body: body,
       style: 'width: 500px;',
       buttons: ['ok'],
       effect: 'fade_in_and_scale',
       onok: updateReminder
  };
  let popup = xdialog.create(popupConf);
  popup.show();
}

/* Process current webpage to potentially generate the Pop-Up reminder */
const processReminder = function(mutationsList, observer){
  videos = document.getElementsByTagName('video');
  if (videos.length == 0) {
      return;
  }
  //Disconnect the observer to prevent the generation of multiple Pop-Ups 
  observer.disconnect();
  // Get the unlimited period of the current contract (if any) to display in the Pop-Up
  var gettingDaemonSettings = browser.storage.local.get('daemonSettings');
  gettingDaemonSettings.then(result =>{
    var url = getDaemonUrl(result.daemonSettings, 'contractual-settings');
    if (!url) {
      // Daemon IP and Port have not been set
      displayPopup(popupBody.replace('<unlimPeriod>', 'Check your contract information'));
      return;
    }
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.send();
    xhr.onreadystatechange = function(){
      if(xhr.readyState === 4) {
        if (xhr.status === 200) {
          var jsonStats = JSON.parse(xhr.responseText);
          if (jsonStats['currentPeriod'] == 'unlimited') {
              return;
          }
          else if (jsonStats['unlimStartTime'] && jsonStats['unlimEndTime']) {
            var period = ''.concat(jsonStats['unlimStartTime'], ' - ', jsonStats['unlimEndTime']);
            displayPopup(popupBody.replace('<unlimPeriod>', period)); 
            return;
          }
        }
        displayPopup(popupBody.replace('<unlimPeriod>', 'Check your contract information')); 
      }
    };
  });
};

/* Reminder Pop-Up observer */
function popupObserver() {
  // Get current state from browse storage 
  const observerConfig = {subtree: true, childList: true};
  MutationObserver = window.MutationObserver ;
  var observer = new MutationObserver(processReminder);
  observer.observe(document, observerConfig);
}


/******************************************************/
/********** Block Atuomatic Videos Feature ************/
/******************************************************/

/* Interval time (in ms) to parse the videos of the website */
const PARSING_FREQUENCY = 1000;

var parsedVideos = new Set();
var divsMappingVideos = new Map();
var videosMappingHandlers = new Map();

/* Helper function : get position of particular DOM element in the window */
var getElementPosition = function(element) {
  var x = 0;
  var y = 0;
  while (element){
    x += (element.offsetLeft) ? element.offsetLeft : 0;
    y += (element.offsetTop) ? element.offsetTop : 0;
    element = element.offsetParent;
  }
  return { x: x, y: y };
}

/* Update the created Div elements */
var updateDivs = function() {
  for (let [div, video] of divsMappingVideos) {
    if (video.style.display == 'none') {
      div.style.display = 'none';
    } else {
      var videoRect = video.getBoundingClientRect();
      var videoPosition = getElementPosition(video);
      div.style.left = ''.concat(videoPosition.x, 'px');
      div.style.top = ''.concat(videoPosition.y, 'px');
      div.style.width = ''.concat(videoRect.width, 'px');
      div.style.height = ''.concat(videoRect.height, 'px');
    }
  }
}

/* Create Div elements associated to the videos. */
var createDiv = function() {
  var div = document.createElement("div");
  div.style.position = "absolute";
  div.style.zIndex = 2147483647; // Put the div in the foreground, 2147483647 = max value allowed for z axis
  div.addEventListener("click", function() {playVideo(this)}, false);
  document.body.appendChild(div);
  return div;
}

/* Pause the video and disable content preload  */
var pauseVideo = function(video) {
  if (!video.paused) {
      video.pause();
  }
  if (video.autoplay) {
      video.autoplay = false;
  }
  video.preload = 'none';
}

/* Play the video and remove corresponding div element */
var playVideo = function(div) {
  var video = divsMappingVideos.get(div);
  var handler = videosMappingHandlers.get(video);
  video.removeEventListener('play', handler, false);
  video.removeEventListener('playing', handler, false);
  video.preload = 'auto';
  video.play();
  div.remove();
}

/* Parse the video elements of the website  */
var parseVideos = function() {
  var videoElements = document.getElementsByTagName('video');
  for (var i = 0; i < videoElements.length; i++) {
    var video = videoElements[i];
    if (parsedVideos.has(video)){
      continue;
    }
    pauseVideo(video);
    parsedVideos.add(video);

    var handler = this.pauseVideo.bind(this, video);
    videosMappingHandlers.set(video, handler);

    video.addEventListener('play', handler, false);
    video.addEventListener('playing', handler, false);
    //video.addEventListener('loadstart', handler, false);
    //video.addEventListener('loaded-metadata', handler, false);
    var newDiv = createDiv();
    divsMappingVideos.set(newDiv, video);
  }
  updateDivs();
}

var blockVideos = function() {
  parseVideos();
  setTimeout(blockVideos, PARSING_FREQUENCY);
}

/*

Tried to add a mutation observer to 'Block videos' feature to increase preaload prevention by disabling preload
as soon as the DOM mutates, but no improvement was observed and it seemed to increase the processing charge

const callback = function(mutationsList, observer){
  parseVideos();
}

const observerConfig = {subtree: true, childList: true};
MutationObserver = window.MutationObserver ;
var observer = new MutationObserver(callback);
observer.observe(document, observerConfig);

*/


/*************************************************/
/******************** Main ***********************/
/*************************************************/

// Get features state from browse storage 
var gettingFeaturesState = browser.storage.local.get(['reminderState', 'blockVideosState']);
gettingFeaturesState.then(result =>{
  if ('reminderState' in result && result.reminderState){
    /* Display Pop-Up feature */
    popupObserver();
  }
  if ('blockVideosState' in result && result.blockVideosState){
    /* Block Automatic videos feature  */
    blockVideos();
  }
});

