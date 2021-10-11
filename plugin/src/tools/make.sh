#!/usr/bin/env bash

echo "*** Creating web store package"

BLDIR=build
DES="$BLDIR"/fap_unsigned
rm -rf $DES
mkdir -p $DES

echo "*** Copying files"
bash ./tools/copy-files.sh  $DES

cp -R $DES/_locales/nb $DES/_locales/no

echo "*** Creating package..."
pushd $DES > /dev/null
zip ../$(basename $DES).xpi -qr *
popd > /dev/null

echo "*** Package done."
