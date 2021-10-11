//
// Copyright (c) Viveris Technologies.
// Licensed under the MIT license. See LICENSE file in the project root for details.
//


function goToMainPage() {
  window.location.href = "mainpage.html";
}

var goToMainPageButton = document.getElementById("goToMainPageButton");
goToMainPageButton.addEventListener("click", goToMainPage, false);

