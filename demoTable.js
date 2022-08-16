function showDemoTable() {
    let objects = demoObjects();
    let t = new ObjectTable('tableDemo', objects);
    t.config.keyForUID = 'id';
    t.config.keysToShow = ['id', 'ip', 'short_string', 'rnd_num', 'rnd_bool', 'med_string', 'long_string'];
    t.config.headerOverrides = {
        'id': 'Object',
        'ip': 'IP Address'
    }
    t.config.headerLinks['short_string'] = () => {
        alert('this function should do something with the short_string column, in this case we will just hide it');
        t._controls.allKeys['short_string'] = false;
        t.display(t._controls.containerID);
    }
    t.config.showRefresh = true;
    t.config.funcRefresh = showDemoTable;
    t.config.showCSV = true;
    t.config.showAdd = true;
    t.config.funcAdd = demoAdd;
    t.config.showClose = true;
    t.config.funcClose = demoClose;
    t.config.showFilterFor = ['*'];
    t.config.showSortFor = ['*'];
    t.config.keyToSort = 'id';
    t.config.links = {
        'id': {'func': demoShow, 'omit': ['object_0']}
    }
    t.config.multiSelect = {
        'Delete': {'func': demoDelete, 'omit': ['object_0'], 'before': true},
        'Ping': {'func': demoPing, 'keyOverride': 'ip'}
    }
    t.config.paginate = 20;
    t.display('main');
}

function demoObjects() {
    let objects = [];
    for (let i = 0; i < 100; i++) {
        const obj = {};
        obj['id'] = `object_${i}`;
        obj['ip'] = randomIP();
        obj['short_string'] = randomString(7);
        obj['rnd_num'] = randomInt();
        obj['rnd_bool'] = randomBool();
        obj['med_string'] = randomString(15);
        obj['new_lines'] = `${randomString(5)}\n${randomString(5)}`;
        obj['long_string'] = randomString(50);
        obj['super_long_string'] = randomString(120);
        objects.push(obj);
    }
    return objects;
}

function demoShow(sID) {
    alert(`This function should show info / edit for ${sID} (note we can omit certain values from being clickable)`);
}

function demoAdd() {
    alert('This function should add a new object to the source data and refresh the table');
}

function demoDelete(aIDs) {
    let msg = `This function should delete ${aIDs.length} objects from the source data and refresh the table (note we can omit values from being selected):`;
    for (const id of aIDs) {
        msg += `\n${id}`;
    }
    alert(msg);
}

function demoClose() {
    alert('This function would close the table and go to another page');
}

function demoPing(aIPs) {
    let msg = `This function should process ${aIPs.length} values from the ips column:`;
    for (const ip of aIPs) {
        msg += `\n${ip}`;
    }
    alert(msg);
}

function randomString(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for ( let i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() *
            characters.length));
    }
    return result;
}

function randomBool() {
    const options = [true,false];
    return options[Math.floor(Math.random() * options.length)];
}

function randomInt() {
    return Math.floor(Math.random() * 100);
}

function randomIP() {
    const octet1 = Math.floor(Math.random() * 255);
    const octet2 = Math.floor(Math.random() * 255);
    const octet3 = Math.floor(Math.random() * 255);
    const octet4 = Math.floor(Math.random() * 255);
    return `${octet1}.${octet2}.${octet3}.${octet4}`;
}