/* This script aims to synchronize the state of the "Block Ads" FAP feature with the state of uBlock */

'use strict';


const messaging = vAPI.messaging;
let ublockData = {};


// Enable/disable 'Block Ads' feature
const updateBlockAds = function(ev) {
    if ( !ublockData || !ublockData.pageURL ) { return; }
    messaging.send('popupPanel', {
        what: 'toggleNetFiltering',
        url: ublockData.pageURL,
        scope: ev.ctrlKey || ev.metaKey ? 'page' : '',
        state: this.checked,
        tabId: ublockData.tabId,
    });
};


// Store current uBlock data &
// display current state of 'Block Ads' feature in pugin mainpage
const cacheUblockData = async function(tabId) {
    const response = await messaging.send('popupPanel', {
        what: 'getPopupData',
        tabId,
    });
    ublockData = response;
    uDom('#blockAdsSwitch').prop('checked', ublockData['netFilteringSwitch']);
};


const selfURL = new URL(self.location.href);
const tabId = parseInt(selfURL.searchParams.get('tabId'), 10) || null;
cacheUblockData(tabId);

uDom('#blockAdsSwitch').on('click', updateBlockAds);

