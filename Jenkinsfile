node('docker') {

    stage('Delegate to build job') {
        build job: '../fap-video-ci', parameters: [string(name: 'BRANCH_NAME', value: env.BRANCH_NAME)], propagate: true, wait: true
    }

}
