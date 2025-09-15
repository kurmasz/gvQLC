ls
npm run test
sudo sysctl -w kernel.apparmor_restrict_unprivileged_userns=0
xvfb-run --auto-servernum --server-args='-screen 0 1920x1080x24' npm run tes
xvfb-run --auto-servernum --server-args='-screen 0 1920x1080x24' npm run test
exit
ls
xvfb-run --auto-servernum --server-args='-screen 0 1920x1080x24' npm run test
export DISPLAY=:99
export VSCODE_USER_DATA_DIR=/tmp/vscode-test-user-data
export XDG_CONFIG_HOME=$HOME/.config
export XDG_DATA_HOME=$HOME/.local/share
Xvfb :99 -screen 0 1920x1080x24 -ac +extension RANDR +render &
fg
bg
xvfb-run --auto-servernum --server-args='-screen 0 1920x1080x24' npm run test
ps
npm run test
dbus-launch xterm
echo $XDG_RUNTIME_DIR
echo $VSCODE_USER_DATA_DIR
echo $XDG_CONFIG_HOME
code --verbose
/tmp/test-resources/VSCode-linux-x64/bin/code --verbose
sudo chown root:root /tmp/test-resources/VSCode-linux-x64/chrome-sandbox
sudo chmod 4755 /tmp/test-resources/VSCode-linux-x64/chrome-sandbox
/tmp/test-resources/VSCode-linux-x64/bin/code --verbose
exit
cat docker_run 
npm run test
exit
ls
exit
npm run test
ls /tmp/test-resources/chromedriver-linux64/
rm -rf /tmp/test-resources/
npm run test
exit
