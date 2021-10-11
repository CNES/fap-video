#!/usr/bin/env bash

DES=$1

cp manifest.json                    $DES/
cp mainpage.html                    $DES/
cp mainpage.js                      $DES/
cp features.js                      $DES/
cp contractual_settings.html        $DES/
cp contractual_settings.js          $DES/
cp daemon_settings.html             $DES/
cp daemon_settings.js               $DES/
cp info.html                        $DES/
cp info.js                          $DES/

cp -r css                           $DES/
cp -r icons                        $DES/
cp -r webboost                      $DES/
cp -r utils                         $DES/
cp -r uBlock/*                      $DES/

