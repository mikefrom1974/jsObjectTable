// objectTable is a project to make displaying object in tables easier without relying on js frameworks.
// it uses vanilla JS and allows an array of objects (i.e. from an API call) to be displayer in a table.
// it allows fields to be filtered, sorted, used as links to launch functions, and much more.
// note: sub-objects will be flattened (see flattenObject)
// method parameters are prefixed with the expected variable type (i.e. sName)
//  s string, i int, f float, b bool, o object, e event
//  a array, u set(unique) : these will be paired with element type, i.e. aoMyObjects

// ObjectTable is the class that you use to create a nre table generator / controller
class ObjectTable {
    constructor(sName, aoObjects) {
        //sanity check
        if (!this.isString(sName) || sName === '') {
            throw(`Table name must be provided`);
        }
        if (!this.isArray(aoObjects) || (aoObjects.length > 0 && !this.isObject(aoObjects[0]))) {
            throw(`Data must be provided as an array of objects`)
        }
        //initialize
        this.name = sName;              //will be used as the <table id="...'>
        this.objects = aoObjects;        //the data set we will use to generate the table
        //set up default configuration
        this.config = {
            keysToShow: [],                     //array[string]: object keys to show in order (blank = all, unordered)
            keyForUID: '',                      //string: unique key, used as default arg for most bound functions
            headerOverrides: {},                //object: map of key names to header text, i.e. {'id':'ID'}
            hideHeaderSelect: false,            //bool: hide header select controls (lock table to initial headers)
            captionHTML: this.name,             //string: table caption row will be created with this title
            showRefresh: false,                 //bool: show icon to repopulate the table from source
            funcRefresh: null,                  //func: should refresh the object array from source and call this.update
            showClose: false,                   //bool: show icon to close the table (must be paired with a function
            funcClose: null,                    //func: function to close the table (hide overlay, go home, etc)
            showAdd: false,                     //bool: show icon to add a new object (to the source)
            funcAdd: null,                      //func: should show a form to add an object, then refresh the table
            showCSV: false,                     //bool: show icon to download CSV
            showFilterFor: [],                  //array[string]: filter icon will be shown on these columns
                                                // use ['*'] to show filter for all keys
            filterValues: {},                   //object: map of keys to filter, i.e. {'id':'abc'}
            showSortFor: [],                    //array[string]: sort icon will be shown on these columns
                                                // use ['*'] to show sort for all keys
            keyToSort: '',                      //string: current sorted key
            sortDescend: false,                 //bool: sort in reverse order
            links: {},                          //object: map of keys to bind functions to
                                                // i.e. {'exampleKey': {'func': myFunc, 'keyOverride': 'id', 'omit': []}
                                                // function should take string arg
                                                // keyOverride specifies the column value to bind (blank = this key)
                                                // any values in omit will not have links applied
            multiSelect: {},                    //object: map of header names to multiselect functions
                                                // i.e. {'Delete': {'func': myFunc, 'keyOverride': 'exampleKey', 'omit': []}
                                                // column will be populated with checkboxes, header should NOT be in keys
                                                // function should take array of strings
                                                // keyOverride specifies the column values to bind (blank = UID key)
                                                // any values in omit will not have checkboxes
            hideInvalid: false,                 //bool: show blank cell instead of 'null' or 'undefined'
            htmlTrue: '&#10004;',               //string: replace true boolean with checkmark, etc
            htmlFalse: '',                      //string: replace false boolean with HTML symbol
            paginate: 25   ,                    //int: limit displayed rows to given length (0 for no pagination)
            hidePagination: false,              //bool: do not show pagination controls (lock table to 1st page)
            applyImagesTo: [],                  //array[string]: this key's value is an image name to show instead
            appendToTarget: false               //don't clear out the parent container before appending the table
        }
        //set up default controls. these should not be manually set unless there is a specific reason
        this._controls = {
            containerID: '',
            pageNum: 1,
            allKeys: {},        //holds {'key': bool} of key order and whether to show its column
            selected: {},       //selected[multiSelectColumn] will hold a checkbox id, value, and selected bool
                                // i.e. {'Delete': [{'boxID': 'select.Delete.1', 'value':'mySvr1', 'selected':false}]}
            lastClickedBox: {}  //holds the last clicked checkbox for shift selecting. {'boxID': '', 'header': ''}
        }
        //set up styling (will be copied to generated table)
        this.tableColors = {
            //these will be used for the style templates (leave blank for default)
            tableBG: '',
            captionBG: '',
            trBG: '',
            thBG: '',
            tdBG: '',
            footerBG: '',
            tableBorder: '1px solid #cccccc',
            captionBorder: '1px solid #cccccc',
            trBorder: '1px solid #cccccc',
            thBorder: '1px solid #aaaaaa',
            tdBorder: '1px solid #cccccc',
            footerBorder: '',
            //these will ve used when generating the table
            uidHeaderBG: '#aaddff',
            trEvenBG: '#dddddd',
            trOddBG: '',
            trHoverBG: '#96ccff',
            clickColor: '#3333dd',
            //tooltips
            toolTipBG: '#ddeeee',
            toolTipBorder: '1px solid #444444',
            toolTipBorderRadius: '6px'
        }
        this.tablePadding = {
            //padding defined here is applied to the interior of caption, header, cells, and footer.
            left: '3px',
            right: '3px',
            top: '3px',
            bottom: '3px',
            innerCaptionSides: '10px',  //will be added between captionHTML and same-row icons
            innerColumnTop: '2px',      //will be applied for spacing where a row / cell contains a column
            paginator: '8px',           //will be applied between << < 1 > >>
            toolTip: '3px'              //will be applied to popup tooltips
        }
        this.imageSrc = {
            //The table manipulation images should be ~16x16px
            refresh: 'img/refreshSmall.png',
            add: `img/add.png`,
            csv: `img/csv.png`,
            filter: `img/filter.png`,
            filtered: 'img/filtered.png',
            sortNone: 'img/sortNone.png',
            sortAsc: 'img/sortAsc.png',
            sortDesc: 'img/sortDesc.png',
            close: 'img/close.png',
            selectAll: 'img/selectAll.png',
            selectNone: 'img/selectNone.png',
            selectInverse: 'img/selectInverse.png'
        }
        this.toolTip = {
            container: document.createElement('div'),
            init: () => {
                this.toolTip.container.style.position = 'absolute';
                this.toolTip.container.innerHTML = "hello, there";
                this.toolTip.container.style.border = this.tableColors.toolTipBorder;
                this.toolTip.container.style.borderRadius = this.tableColors.toolTipBorderRadius;
                this.toolTip.container.style.backgroundColor = this.tableColors.toolTipBG;
                this.toolTip.container.style.padding = this.tablePadding.toolTip;
                this.toolTip.container.style.top = '-1000px';
                this.toolTip.container.style.left = '0px';
                this.toolTip.container.style.opacity = '0';
                this.toolTip.container.style.transition = 'opacity .2s ease-in';
            },
            delayMS: 400,
            posX: 0,
            posY: 0,
            offset: 10,
            timer: {},
            show: (e, sMsg) => {
                this.toolTip.container.innerHTML = sMsg;
                this.toolTip.posX = e.clientX + this.toolTip.offset;
                this.toolTip.posY = e.clientY + this.toolTip.offset;
                this.toolTip.timer = setTimeout(this.toolTip._fadeIn, this.toolTip.delayMS);
            },
            _fadeIn: () => {
                this.toolTip.container.style.top = `${this.toolTip.posY}px`;
                this.toolTip.container.style.left = `${this.toolTip.posX}px`;
                this.toolTip.container.style.opacity = '0';
                this.toolTip.container.style.display = 'block';
                setTimeout(() => {
                    this.toolTip.container.style.opacity = '1';
                }, 220);
            },
            hide: () => {
                clearTimeout(this.toolTip.timer);
                this.toolTip.container.style.opacity = '0';
                this.toolTip.container.style.top = '-1000px';
                this.toolTip.container.style.left = '0px';
            }
        }
        this.table = document.createElement('table'); //style template for the table
        this.table.style.display = 'inline-block';
        this.table.style.width = 'auto';
        this.table.style.height = 'auto';
        if (this.tableColors.tableBG) {this.table.style.backgroundColor = this.tableColors.tableBG}
        if (this.tableColors.tableBorder) {this.table.style.border = this.tableColors.tableBorder}
        this.table.style.borderCollapse = 'collapse';
        this.table.style.borderSpacing = '0';
        this.table.style.fontFamily = 'arial, sans-serif';
        this.table.style.whiteSpace = 'nowrap';
        this.table.style.paddingLeft = '0px';
        this.table.style.paddingRight = '0px';
        this.table.style.paddingTop = '0px';
        this.table.style.paddingBottom = '0px';
        this.tableCaption = document.createElement('caption');
        this.tableCaption.style.width = "auto";
        this.tableCaption.style.height = "auto";
        if (this.tableColors.captionBG) {this.tableCaption.style.backgroundColor = this.tableColors.captionBG}
        if (this.tableColors.captionBorder) {this.tableCaption.style.border = this.tableColors.captionBorder}
        this.tableCaption.style.textAlign = "center";
        this.tableCaption.style.fontWeight = "bold";
        this.tableCaption.style.fontStyle = "normal";
        this.tableCaption.style.paddingLeft = this.tablePadding.left;
        this.tableCaption.style.paddingRight = this.tablePadding.right;
        this.tableCaption.style.paddingTop = this.tablePadding.top;
        this.tableCaption.style.paddingBottom = this.tablePadding.bottom;
        this.tableRow = document.createElement('tr');
        if (this.tableColors.trBG) {this.tableRow.style.backgroundColor = this.tableColors.trBG}
        if (this.tableColors.trBorder) {this.tableRow.style.border = this.tableColors.trBorder}
        this.tableRow.style.paddingLeft = '0px';
        this.tableRow.style.paddingRight = '0px';
        this.tableRow.style.paddingTop = '0px';
        this.tableRow.style.paddingBottom = '0px';
        this.tableHeader = document.createElement('th');
        this.tableHeader.style.width = "auto";
        this.tableHeader.style.height = "auto";
        if (this.tableColors.thBG) {this.tableHeader.style.backgroundColor = this.tableColors.thBG}
        if (this.tableColors.thBorder) {this.tableHeader.style.border = this.tableColors.thBorder}
        this.tableHeader.style.textAlign = "left";
        this.tableHeader.style.fontWeight = "bold";
        this.tableHeader.style.fontStyle = "normal";
        this.tableHeader.style.paddingLeft = this.tablePadding.left;
        this.tableHeader.style.paddingRight = this.tablePadding.right;
        this.tableHeader.style.paddingTop = this.tablePadding.top;
        this.tableHeader.style.paddingBottom = this.tablePadding.bottom;
        this.tableData = document.createElement('td');
        this.tableData.style.width = "auto";
        this.tableData.style.height = "auto";
        if (this.tableColors.tdBG) {this.tableData.style.backgroundColor = this.tableColors.tdBG}
        if (this.tableColors.tdBorder) {this.tableData.style.border = this.tableColors.tdBorder}
        this.tableData.style.textAlign = "left";
        this.tableData.style.fontWeight = "normal";
        this.tableData.style.fontStyle = "normal";
        this.tableData.style.paddingLeft = this.tablePadding.left;
        this.tableData.style.paddingRight = this.tablePadding.right;
        this.tableData.style.paddingTop = this.tablePadding.top;
        this.tableData.style.paddingBottom = this.tablePadding.bottom;
        this.tableFooter = document.createElement('tfoot');
        this.tableFooter.style.width = "auto";
        this.tableFooter.style.height = "auto";
        if (this.tableColors.footerBG) {this.tableFooter.style.backgroundColor = this.tableColors.footerBG}
        if (this.tableColors.footerBorder) {this.tableFooter.style.border = this.tableColors.footerBorder}
        this.tableFooter.style.textAlign = "left";
        this.tableFooter.style.fontWeight = "bold";
        this.tableFooter.style.fontStyle = "normal";
        this.tableFooter.style.paddingLeft = this.tablePadding.left;
        this.tableFooter.style.paddingRight = this.tablePadding.right;
        this.tableFooter.style.paddingTop = this.tablePadding.top;
        this.tableFooter.style.paddingBottom = this.tablePadding.bottom;
        this.tableImage = document.createElement('img');
        this.tableImage.style.display = 'block';
        this.tableImage.style.paddingLeft = '0px';
        this.tableImage.style.paddingRight = '0px';
        this.tableImage.style.paddingTop = '0px';
        this.tableImage.style.paddingBottom = '0px';
        this.tableImage.style.alignSelf = 'center';
        //hold our filtered and sorted object array
        this.flat = {
            all: [],
            filtered: [],
            page: []
        }
    }
    //flatten will take in an object and return an object with any sub-objects flattened; called in filter()
    // note: flatten will also convert arrays to comma-separated strings
    // {'account': {'name': 'myAccount', 'number': 1234}, 'users': ['bob','jim']}
    // will become
    // {'account.name': 'myAccount', 'account.number': 1234, 'users': 'bob,jim'}
    flatten(obj) {
        let returnObj = {};
        let usedKeys = new Set();
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                let value = obj[key];
                if (this.isArray(value)) {
                    let newKey = key;
                    for (;;) {
                        if (usedKeys.has(newKey)) {
                            newKey = "#" + newKey;
                        } else {
                            break
                        }
                    }
                    usedKeys.add(newKey);
                    returnObj[newKey] = value.toString();
                } else if (this.isObject(value)) {
                    let subObj = this.flatten(value);
                    for (const subKey in subObj) {
                        if (subObj.hasOwnProperty(subKey)) {
                            let newKey = key + "." + subKey;
                            let newValue = subObj[subKey];
                            for (;;) {
                                if (usedKeys.has(newKey)) {
                                    newKey = "#" + newKey;
                                } else {
                                    break;
                                }
                            }
                            usedKeys.add(newKey);
                            returnObj[newKey] = newValue;
                        }
                    }
                } else {
                    let newKey = key;
                    for (;;) {
                        if (usedKeys.has(newKey)) {
                            newKey = "#" + newKey;
                        } else {
                            break;
                        }
                    }
                    usedKeys.add(newKey);
                    returnObj[newKey] = value;
                }
            }
        }
        return returnObj;
    }
    //filter will filter and flatten the full objects array into this.flat.all and .filtered; called in display()
    filter() {
        this.flat.all = [];
        this.flat.filtered = [];
        this.flat.page = [];
        for (const object of this.objects) {
            let skip = false;
            let flat = this.flatten(object);
            this.flat.all.push(flat);
            for (const key in flat) {
                if (this.config.filterValues.hasOwnProperty(key)) {
                    let match = false;
                    let matchSource = flat[key];
                    let matchTarget = this.config.filterValues[key];
                    if (matchSource === undefined || matchSource === null) {
                        let mt = String(matchTarget).toLowerCase();
                        if (['no', 'false', 'null', 'nil', 'undefined'].includes(mt))  {
                            match = true;
                        }
                    } else if (this.isString(matchSource)) {
                        matchTarget = String(matchTarget);
                        let sections = matchTarget.split('/');
                        if (matchTarget.startsWith('/') && sections.length === 3) {
                            //if our matchTarget is encased in //, use regex
                            let mt = sections[1];
                            let flags = sections[2];
                            let rgx = (flags.includes('i')) ? new RegExp(mt, 'i') : new RegExp(mt);
                            if (rgx.test(matchSource)) {
                                match = true;
                            }
                        } else {
                            // match string case-insensitive / partial
                            let ms = matchSource.toLowerCase();
                            let mt = matchTarget.toLowerCase();
                            if (ms.includes(mt)) {
                                match = true;
                            }
                        }
                    } else if (this.isBoolean(matchSource)) {
                        //booleans match 'true' or 'false' or 'yes' or 'no'
                        let mt = String(matchTarget.toLowerCase());
                        if (matchSource && (mt === 'yes' || mt === 'true' || mt === '1')) {
                            match = true;
                        } else if (!matchSource && (mt === 'no' || mt === 'false' || mt === '0')) {
                            match = true;
                        } else if (String(matchSource).toLowerCase().includes(mt)) {
                            match = true;
                        }
                    } else if (this.isNumber(matchSource)) {
                        //numbers must match fully
                        if (`${matchSource}` === `${matchTarget}`) {
                            match = true;
                        }
                    } else {
                        //blind match
                        let ms = `${matchSource}`.toLowerCase();
                        let mt = `${matchTarget}`.toLowerCase();
                        if (ms.includes(mt)) {
                            match = true;
                        }
                    }
                    if (!match) {
                        skip = true;
                    }
                }
            }
            if (!skip) {
                this.flat.filtered.push(flat);
            }
        }
    }
    //sort will sort the filtered objects array by the given key (column); called in display()
    sort(sKey, bReverse) {
        if (this.flat.filtered.length > 1) {
            this.flat.filtered.sort((oA,oB) => {
                let a = oA[sKey];
                let b = oB[sKey];
                let r = (bReverse) ? -1 : 1;
                //handle completely equal
                if (a === b) {
                    return 0
                }
                //handle null / undefined. Null / undefined > anything else to be pushed to end of list
                if (a === undefined) {
                    return 1 * r;
                } else if (b === undefined) {
                    return -1 * r
                }
                if (a === null) {
                    return 1 * r;
                } else if (b === null) {
                    return -1 * r;
                }
                //handle boolean. True should be less than false to appear at the top of a list.
                if (this.isBoolean(a) && this.isBoolean(b)) {
                    if (a) {
                        return -1 * r;
                    } else {
                        return 1 * r;
                    }
                }
                //handle numbers
                if (this.isNumber(a) && this.isNumber(b)) {
                    return (a - b) * r;
                }
                //handle strings
                if (this.isString(a) && this.isString(b)) {
                    //IP addresses
                    const rgxIPv4 = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
                    if (rgxIPv4.test(a) && rgxIPv4.test(b)) {
                        const num1 = Number(a.split('.').map((num) => (`000${num}`).slice(-3) ).join(''));
                        const num2 = Number(b.split('.').map((num) => (`000${num}`).slice(-3) ).join(''));
                        return (num1-num2) * r;
                    }
                    //identical strings ending in numbers (to avoid 1, 10 , 11 ordering)
                    const rgxNumberSfx = /(.+?)(\d+)$/;
                    const matchA = a.match(rgxNumberSfx);
                    if (matchA && matchA.length === 3) {
                        const matchB = b.match(rgxNumberSfx);
                        if (matchB && matchB.length === 3) {
                            if (matchA[1] === matchB[1]) {
                                return (parseInt(matchA[2]) - parseInt(matchB[2])) * r;
                            }
                        }
                    }
                    //regular strings
                    return a.localeCompare(b) * r;
                }
                //just WAG it
                return ((a < b) ? -1 : (a > b) ? 1 : 0) * r;
            })
        }
    }
    // display will populate the <div> (or other container) with the given id using its innerHTML
    display(sContainerID) {
        if (!this.isString(sContainerID) || sContainerID === '') {
            throw('display must be called with a container id argument')
        }
        const container = document.getElementById(sContainerID);
        if (!container) {
            throw(`${sContainerID} is not a valid HTML element`);
        }
        //setup
        this.verify();
        if (this.isString(sContainerID) && sContainerID !== '') {
            this._controls.containerID = sContainerID;
        }
        this.filter();
        if (this.config.keyToSort) {
            this.sort(this.config.keyToSort, this.config.sortDescend);
        }
        const totalKeys = Object.keys(this._controls.allKeys).length;
        let shownKeys = 0;
        for (const display of Object.values(this._controls.allKeys)) {
            if (display) {
                shownKeys++;
            }
        }
        let totalPages = 1;
        if (this.config.paginate > 0) {
            while (this.config.paginate * totalPages < this.flat.filtered.length) {
                totalPages++;
            }
        }
        const containerWidth = window.getComputedStyle(container).width;
        //set 'before' bg colors for hover highlighting
        const defBG = window.getComputedStyle(container).backgroundColor;
        if (!this.tableColors.trEvenBG) {
            if (this.tableColors.trBG) {
                this.tableColors.trEvenBG = this.tableColors.trBG;
            } else if (this.tableColors.tableBG) {
                this.tableColors.trEvenBG = this.tableColors.tableBG;
            } else {
                this.tableColors.trEvenBG = defBG;
            }
        }
        if (!this.tableColors.trOddBG) {
            if (this.tableColors.trBG) {
                this.tableColors.trOddBG = this.tableColors.trBG;
            } else if (this.tableColors.tableBG) {
                this.tableColors.trOddBG = this.tableColors.tableBG;
            } else {
                this.tableColors.trOddBG = defBG;
            }
        }
        //create table
        const tbl = document.createElement('table');
        tbl.style.cssText = this.table.style.cssText;
        tbl.id = this.name;
        //add caption (top row: refresh > csv > caption > add > close; bottom row: header / page info)
        const tblCap = document.createElement('caption');
        tblCap.style.cssText = this.tableCaption.style.cssText;
        const tblCapDiv = document.createElement('div');
        tblCapDiv.style.flexDirection = 'column';
        tblCapDiv.style.alignItems = 'center';
        const tblCapR1 = document.createElement('div');
        tblCapR1.style.display = 'flex';
        tblCapR1.style.flexDirection = 'row';
        tblCapR1.style.width = '100%';
        tblCapR1.style.maxWidth = containerWidth;
        tblCapR1.style.alignItems = 'center';
        tblCapR1.style.justifyContent = this.tableCaption.style.textAlign;

        const refreshImg = document.createElement('img');
        refreshImg.style.cssText = this.tableImage.style.cssText;
        refreshImg.style.paddingLeft = this.tablePadding.left;
        refreshImg.style.paddingRight = this.tablePadding.right;
        refreshImg.src = this.imageSrc.refresh;
        refreshImg.alt = 'repopulate table';
        if (this.config.showRefresh) {
            refreshImg.style.cursor = 'pointer';
            refreshImg.onclick = this.config.funcRefresh;
            refreshImg.onmouseover = (e) => {this.toolTip.show(e, 'repopulate table from source')};
            refreshImg.onmouseout = () => {this.toolTip.hide()};
        } else {
            refreshImg.style.visibility = 'hidden';
        }
        tblCapR1.appendChild(refreshImg);

        const csvImg = document.createElement('img');
        csvImg.style.cssText = this.tableImage.style.cssText;
        csvImg.style.paddingLeft = this.tablePadding.left;
        csvImg.style.paddingRight = this.tablePadding.right;
        csvImg.src = this.imageSrc.csv;
        csvImg.alt = 'download CSV';
        if (this.config.showCSV) {
            csvImg.style.cursor = 'pointer';
            csvImg.onclick = () => this.downloadCSV();
            csvImg.onmouseover = (e) => {this.toolTip.show(e, 'download CSV file')};
            csvImg.onmouseout = () => {this.toolTip.hide()};
        } else {
            csvImg.style.visibility = 'hidden';
        }
        tblCapR1.appendChild(csvImg);

        const capHTML = document.createElement('div');
        capHTML.style.display = 'flex';
        capHTML.style.justifyContent = this.tableCaption.style.textAlign;
        capHTML.style.flexGrow = '1';
        capHTML.style.paddingLeft = this.tableCaption.style.paddingLeft;
        capHTML.style.paddingRight = this.tableCaption.style.paddingRight
        const capInnerDiv = document.createElement('div'); //this is to allow <br /> in a flex row
        capInnerDiv.innerHTML = this.config.captionHTML;
        capHTML.appendChild(capInnerDiv);
        tblCapR1.appendChild(capHTML);

        const addImg = document.createElement('img');
        addImg.style.cssText = this.tableImage.style.cssText;
        addImg.style.paddingLeft = this.tablePadding.left;
        addImg.style.paddingRight = this.tablePadding.right;
        addImg.src = this.imageSrc.add;
        addImg.alt = 'add new';
        if (this.config.showAdd) {
            addImg.style.cursor = 'pointer';
            addImg.onclick = this.config.funcAdd;
            addImg.onmouseover = (e) => {this.toolTip.show(e, 'add new object to source')};
            addImg.onmouseout = () => {this.toolTip.hide()};
        } else {
            addImg.style.visibility = 'hidden';
        }
        tblCapR1.appendChild(addImg);

        const closeImg = document.createElement('img');
        closeImg.style.cssText = this.tableImage.style.cssText;
        closeImg.style.paddingLeft = this.tablePadding.left;
        closeImg.style.paddingRight = this.tablePadding.right;
        closeImg.src = this.imageSrc.close;
        closeImg.alt = 'close table';
        if (this.config.showClose) {
            closeImg.style.cursor = 'pointer';
            closeImg.onclick = this.config.funcClose;
            closeImg.onmouseover = (e) => {this.toolTip.show(e, 'close table')};
            closeImg.onmouseout = () => {this.toolTip.hide()};
        } else {
            closeImg.style.visibility = 'hidden';
        }
        tblCapR1.appendChild(closeImg);
        tblCapDiv.appendChild(tblCapR1);

        if (!this.config.hideHeaderSelect || !this.config.hidePagination) {
            const tblCapR2 = document.createElement('div');
            tblCapR2.style.display = 'flex';
            tblCapR2.style.flexDirection = 'row';
            tblCapR2.style.width = '100%';
            tblCapR2.style.maxWidth = containerWidth;
            tblCapR2.style.alignItems = 'center';
            tblCapR2.style.justifyContent = this.tableCaption.style.textAlign;
            tblCapR2.style.fontWeight = 'normal';
            tblCapR2.style.fontSize = 'small';

            if (!this.config.hidePagination && this.flat.filtered.length > 0) {
                const pageControl = document.createElement('div');
                pageControl.style.display = 'flex';
                pageControl.style.flexDirection = 'row';
                pageControl.style.flexGrow = '1';
                pageControl.style.justifyContent = 'left';
                pageControl.style.paddingRight = this.tablePadding.innerCaptionSides;
                if (this.config.paginate > 0) {
                    const firstPage = document.createElement('a');
                    firstPage.style.color = '#cccccc';
                    firstPage.innerHTML = '&lt;&lt;';
                    if (!(this._controls.pageNum < 2)) {
                        firstPage.href = '#';
                        firstPage.style.color = this.tableColors.clickColor;
                        firstPage.onclick = () => {
                            this._controls.pageNum = 1;
                            this.display(this._controls.containerID);
                        }
                    }
                    pageControl.appendChild(firstPage);
                    const prevPage = document.createElement('a');
                    prevPage.style.paddingLeft = this.tablePadding.paginator;
                    prevPage.style.color = '#cccccc';
                    prevPage.innerHTML = '&lt;';
                    if (!(this._controls.pageNum < 2)) {
                        prevPage.href = '#';
                        prevPage.style.color = this.tableColors.clickColor;
                        prevPage.onclick = () => {
                            this._controls.pageNum--;
                            this.display(this._controls.containerID);
                        }
                    }
                    pageControl.appendChild(prevPage);
                    const pageNum = document.createElement('a');
                    pageNum.style.paddingLeft = this.tablePadding.paginator;
                    pageNum.href = '#';
                    pageNum.style.color = this.tableColors.clickColor;
                    pageNum.innerHTML = `${this._controls.pageNum}`;
                    pageNum.onclick = () => {
                        const value = parseInt(prompt('Page Number:'));
                        if (this.isNumber(value)) {
                            this._controls.pageNum = value;
                            this.display(this._controls.containerID);
                        }
                    }
                    pageControl.appendChild(pageNum);
                    const pageTotal = document.createElement('a');
                    pageTotal.innerHTML = `/${totalPages}`;
                    pageControl.appendChild(pageTotal);
                    const nextPage = document.createElement('a');
                    nextPage.style.paddingLeft = this.tablePadding.paginator;
                    nextPage.style.color = '#cccccc';
                    nextPage.innerHTML = '&gt;';
                    if (this._controls.pageNum < totalPages) {
                        nextPage.href = '#';
                        nextPage.style.color = this.tableColors.clickColor;
                        nextPage.onclick = () => {
                            this._controls.pageNum++;
                            this.display(this._controls.containerID);
                        }
                    }
                    pageControl.appendChild(nextPage);
                    const lastPage = document.createElement('a');
                    lastPage.style.paddingLeft = this.tablePadding.paginator;
                    lastPage.style.color = '#cccccc';
                    lastPage.innerHTML = '&gt;&gt;';
                    if (this._controls.pageNum < totalPages) {
                        lastPage.href = '#';
                        lastPage.style.color = this.tableColors.clickColor;
                        lastPage.onclick = () => {
                            this._controls.pageNum = totalPages;
                            this.display(this._controls.containerID);
                        }
                    }
                    pageControl.appendChild(lastPage);
                }
                tblCapR2.appendChild(pageControl);
            }

            if (!this.config.hideHeaderSelect) {
                const hdrControl = document.createElement('div');
                hdrControl.style.display = 'flex';
                hdrControl.style.flexDirection = 'row';
                hdrControl.style.flexGrow = '1';
                hdrControl.style.justifyContent = 'right';
                hdrControl.style.paddingLeft = this.tablePadding.innerCaptionSides;
                const hdrControlC1 = document.createElement('html');
                hdrControlC1.innerText = `${shownKeys}/${totalKeys}`;
                hdrControl.appendChild(hdrControlC1);
                const hdrControlC2 = document.createElement('a');
                hdrControlC2.href = '#';
                hdrControlC2.style.color = this.tableColors.clickColor;
                hdrControlC2.innerHTML = `&nbsp;headers&nbsp;`;
                hdrControl.onclick = () => this.selectHeaders();
                hdrControl.appendChild(hdrControlC2);
                const hdrControlC3 = document.createElement('html');
                hdrControlC3.innerText = `shown`;
                hdrControl.appendChild(hdrControlC3);
                tblCapR2.appendChild(hdrControl);
            }

            tblCapDiv.appendChild(tblCapR2);
        }
        tblCap.appendChild(tblCapDiv);
        tbl.appendChild(tblCap);
        //add headers
        let colCount = 0;
        const hdrRow = document.createElement('tr')
        hdrRow.style.cssText = this.tableRow.style.cssText;

        for (const [key, display] of Object.entries(this._controls.allKeys)) {
            if (!display) {continue}
            const headerTxt = (this.config.headerOverrides.hasOwnProperty(key)) ? this.config.headerOverrides[key] : key;
            const isUID = (key === this.config.keyForUID);
            let showFilter = (this.config.showFilterFor.includes(key));
            if (this.config.showFilterFor.length === 1 && this.config.showFilterFor[0] === '*') {
                showFilter = true;
            }
            const filtered = (this.config.filterValues.hasOwnProperty(key));
            const filterValue = (filtered) ? this.config.filterValues[key] : '';
            let showSort = (this.config.showSortFor.includes(key));
            if (this.config.showSortFor.length === 1 && this.config.showSortFor[0] === '*') {
                showSort = true;
            }
            const sorted = (this.config.keyToSort === key);
            const sortDesc = (this.config.sortDescend);
            const tblHead = document.createElement('th');
            tblHead.style.cssText = this.tableHeader.style.cssText;
            tblHead.id = `th${headerTxt}`;
            if (isUID) {
                tblHead.style.backgroundColor = this.tableColors.uidHeaderBG;
            }
            if (sorted) {
                tblHead.style.fontStyle = 'italic';
            }
            const thDiv = document.createElement('div');
            thDiv.style.display = 'flex';
            thDiv.style.flexDirection = 'column';
            thDiv.style.alignItems = 'center';
            
            const thR1 = document.createElement('div');
            thR1.style.display = 'flex';
            thR1.style.width = '100%';
            thR1.style.flexDirection = 'row';
            thR1.style.justifyContent = 'center';
            thR1.innerText = headerTxt;
            thDiv.appendChild(thR1);

            const thR2 = document.createElement('div');
            thR2.style.display = 'flex';
            thR2.style.width = '100%';
            thR2.style.flexDirection = 'row';
            thR2.style.justifyContent = 'center';
            thR2.style.paddingTop = this.tablePadding.innerColumnTop;

            const thR2C1 = document.createElement('div');
            thR2C1.style.display = 'flex';
            const filterImg = document.createElement('img');
            filterImg.style.cssText = this.tableImage.style.cssText;
            filterImg.style.paddingRight = this.tablePadding.right;
            if (filtered) {
                filterImg.src = this.imageSrc.filtered;
                filterImg.alt = 'remove filter';
            } else {
                filterImg.src = this.imageSrc.filter;
                filterImg.alt = 'filter results';
            }
            if (!showFilter) {
                filterImg.style.visibility = 'hidden';
            } else {
                filterImg.style.cursor = 'pointer';
                if (filtered) {
                    filterImg.onclick = () => {
                        delete this.config.filterValues[key];
                        this.display(this._controls.containerID);
                    }
                    filterImg.onmouseover = (e) => {this.toolTip.show(e, 'clear filter')};
                    filterImg.onmouseout = () => {this.toolTip.hide()};
                } else {
                    filterImg.onclick = () => {
                        const value = prompt('Value to filter?\n' +
                            'Enter string to match partial, case-insensitive.\n' +
                            'Enclose in // to match regexp (i.e. /h.llo/i.');
                        if (value) {
                            this.config.filterValues[key] = value;
                            this.display(this._controls.containerID);
                        }
                    }
                    filterImg.onmouseover = (e) => {this.toolTip.show(e, 'filter by value')};
                    filterImg.onmouseout = () => {this.toolTip.hide()};
                }
            }
            thR2C1.appendChild(filterImg);
            thR2.appendChild(thR2C1);

            const thR2C2 = document.createElement('div');
            thR2C2.style.display = 'flex';
            thR2C2.style.flexGrow = '1';
            thR2C2.style.justifyContent = 'center';
            if (filtered) {
                const filterLink = document.createElement('a');
                filterLink.innerHTML = `<small>(${filterValue})</small>`;
                filterLink.href = '#';
                filterLink.style.fontStyle = 'normal';
                filterLink.style.fontWeight = 'normal';
                filterLink.style.color = this.tableColors.clickColor;
                filterLink.onclick = () => {
                    const value = prompt('Value to filter?<br />' +
                        '<small>* Enter string to match partial, case-insensitive.<br />' +
                        '* Enclose in // to match regexp.</small>');
                    if (value) {
                        this.config.filterValues[key] = value;
                        this.display(this._controls.containerID);
                    } else if (value === '') {
                        delete this.config.filterValues[key];
                        this.display(this._controls.containerID);
                    }
                }
                thR2C2.appendChild(filterLink);
            } else {
                thR2C2.innerHTML = `<small>&nbsp;</small>`;
            }
            thR2.appendChild(thR2C2);

            const thR2C3 = document.createElement('div');
            thR2C3.style.display = 'flex';
            const sortImg = document.createElement('img');
            sortImg.style.cssText = this.tableImage.style.cssText;
            sortImg.style.paddingLeft = this.tablePadding.left;
            if (sorted) {
                sortImg.src = (sortDesc) ? this.imageSrc.sortDesc : this.imageSrc.sortAsc;
                sortImg.alt = (sortDesc) ? 'sort ascending' : 'sort descending';
            } else {
                sortImg.src = this.imageSrc.sortNone;
                sortImg.alt = 'sort by this column';
            }
            if (!showSort) {
                sortImg.style.visibility = 'hidden';
            } else {
                sortImg.style.cursor = 'pointer';
                sortImg.onclick = () => {
                    this.config.sortDescend = (this.config.keyToSort === key) ? !this.config.sortDescend : false;
                    this.config.keyToSort = key;
                    this.display(this._controls.containerID);
                }
                sortImg.onmouseover = (e) => {this.toolTip.show(e, 'sort by this column')};
                sortImg.onmouseout = () => {this.toolTip.hide()};
            }
            thR2C3.appendChild(sortImg);
            thR2.appendChild(thR2C3);

            thDiv.appendChild(thR2);
            tblHead.appendChild(thDiv);
            hdrRow.appendChild(tblHead);
            colCount++;
        }
        this._controls.selected = {};
        //add multiSelect headers
        for (const hdr in this.config.multiSelect) {
            const headerTxt = hdr;
            this._controls.selected[hdr] = [];

            const tblHead = document.createElement('th');
            tblHead.style.cssText = this.tableHeader.style.cssText;

            const thDiv = document.createElement('div');
            thDiv.style.display = 'flex';
            thDiv.style.flexDirection = 'column';
            thDiv.style.alignItems = 'center';

            const thR1 = document.createElement('div');
            thR1.style.display = 'flex';
            thR1.style.width = '100%';
            thR1.style.flexDirection = 'row';
            thR1.style.justifyContent = 'center';
            const selectClick = document.createElement('a');
            selectClick.innerHTML = headerTxt;
            selectClick.href = '#';
            selectClick.style.color = this.tableColors.clickColor;
            selectClick.onclick = () => {
                let ary = [];
                for (const obj of this._controls.selected[hdr]) {
                    if (obj['selected']) {
                        ary.push(obj['value']);
                    }
                }
                this.config.multiSelect[hdr]['func'](ary);
            }
            thR1.appendChild(selectClick);
            thDiv.appendChild(thR1);

            const thR2 = document.createElement('div');
            thR2.style.display = 'flex';
            thR2.style.width = '100%';
            thR2.style.flexDirection = 'row';
            thR2.style.justifyContent = 'center';
            thR2.style.paddingTop = this.tablePadding.innerColumnTop;
            const invertIcon = document.createElement('img')
            invertIcon.style.cssText = this.tableImage.style.cssText;
            invertIcon.src = this.imageSrc.selectInverse;
            invertIcon.alt = 'select inverse';
            invertIcon.style.cursor = 'pointer';
            invertIcon.onclick = () => {
                for (const obj of this._controls.selected[hdr]) {
                    obj['selected'] = !obj['selected'];
                    document.getElementById(obj['boxID']).checked = obj['selected'];
                }
                document.getElementById(`selectColumn${hdr}`).innerHTML = `(${this.selectedCount(hdr)})`;
            }
            invertIcon.onmouseover = (e) => {this.toolTip.show(e, 'invert selection')};
            invertIcon.onmouseout = () => {this.toolTip.hide()};
            thR2.appendChild(invertIcon);
            const selectCount = document.createElement('div');
            selectCount.id = `selectColumn${hdr}`;
            selectCount.style.display = 'flex';
            selectCount.style.justifyContent = 'center';
            selectCount.style.flexGrow = '1';
            selectCount.innerHTML = `(${this.selectedCount(hdr)})`;
            thR2.appendChild(selectCount);
            const selectAllIcon = document.createElement('img');
            selectAllIcon.id = `selectAllIcon${hdr}`;
            selectAllIcon.style.cssText = this.tableImage.style.cssText;
            selectAllIcon.style.cursor = 'pointer';
            selectAllIcon.src = this.imageSrc.selectAll;
            selectAllIcon.alt = 'select all';
            selectAllIcon.onclick = () => {this.selectAll(hdr)};
            selectAllIcon.onmouseover = (e) => {this.toolTip.show(e, 'select all')};
            selectAllIcon.onmouseout = () => {this.toolTip.hide()};
            thR2.appendChild(selectAllIcon);
            thDiv.appendChild(thR2);
            tblHead.appendChild(thDiv);
            hdrRow.appendChild(tblHead);
            colCount++;
        }

        tbl.appendChild(hdrRow);
        //add data rows, accounting for pagination
        let rowCount = 0;
        this._controls.pageNum = Math.max(this._controls.pageNum, 1);
        this._controls.pageNum = Math.min(this._controls.pageNum, totalPages);
        let startRow = (this._controls.pageNum - 1) * this.config.paginate;
        if (startRow >= this.flat.filtered.length) {
            startRow = this.flat.filtered.length - 1;
        }
        for (let i=startRow; i < this.flat.filtered.length; i++)  {
            if (this.flat.filtered.length === 0) {break}
            rowCount++;
            const obj = this.flat.filtered[i];
            this.flat.page.push(obj);
            const tblRow = document.createElement('tr');
            tblRow.style.cssText = this.tableRow.style.cssText;
            if (rowCount % 2 === 0) {
                if (this.tableColors.trEvenBG) {
                    tblRow.style.backgroundColor = this.tableColors.trEvenBG;
                }
            } else {
                if (this.tableColors.trOddBG) {
                    tblRow.style.backgroundColor = this.tableColors.trOddBG;
                }
            }
            if (this.tableColors.trHoverBG) {
                const ogBG = (tblRow.style.backgroundColor) ? tblRow.style.backgroundColor : defBG;
                tblRow.onmouseover = () => {tblRow.style.backgroundColor = this.tableColors.trHoverBG}
                tblRow.onmouseout = () => {tblRow.style.backgroundColor = ogBG}
            }
            //values
            for (const [key, display] of Object.entries(this._controls.allKeys)) {
                if (!display) {continue}
                const tblData = document.createElement('td');
                tblData.style.cssText = this.tableData.style.cssText;
                let value = obj[key];
                if (this.isBoolean(value)) {
                    if (this.isString(this.config.htmlTrue) && value) {
                        value = this.config.htmlTrue;
                    } else if (this.isString(this.config.htmlFalse) && !value) {
                        value = this.config.htmlFalse;
                    }
                }
                if ((value === undefined || value === null) && this.config.hideInvalid) {
                    value = '';
                }
                value = `${value}`.replace(/\n/g, `<br />`);
                value = value.replace(/\t/g, `&nbsp;&nbsp;`);
                if (this.config.links.hasOwnProperty(key) && !(this.config.links[key].hasOwnProperty('omit') && this.config.links[key]['omit'].includes(value))) {
                    let linkValue = value;
                    if (this.config.links[key]['keyOverride']) {
                        linkValue = obj[this.config.links[key]['keyOverride']];
                    }
                    const link = document.createElement('a')
                    link.href = '#';
                    link.style.color = this.tableColors.clickColor;
                    link.innerHTML = `${value}`
                    link.onclick = this.config.links[key]['func'].bind(null, linkValue);
                    tblData.appendChild(link);
                } else {
                    tblData.innerHTML = `${value}`;
                }
                tblRow.appendChild(tblData);
            }
            //multiselect
            for (const hdr in this.config.multiSelect) {
                let valueKey = this.config.multiSelect[hdr]['keyOverride'];
                let value = (valueKey) ? obj[valueKey] : obj[this.config.keyForUID];
                const tblData = document.createElement('td');
                tblData.style.cssText = this.tableData.style.cssText;
                if (!(this.config.multiSelect[hdr].hasOwnProperty('omit') && this.config.multiSelect[hdr]['omit'].includes(value))) {
                    const boxDiv = document.createElement('div');
                    boxDiv.style.display = 'flex';
                    boxDiv.style.flexDirection = 'row';
                    boxDiv.style.width = '100%';
                    boxDiv.style.alignItems = 'center';
                    boxDiv.style.justifyContent = 'center';
                    const box = document.createElement('input');
                    box.type = 'checkbox';
                    box.id = `select.${hdr}.${rowCount}`;
                    if (this.config.keyForUID) {
                        box.id = `select.${hdr}.${value}`;
                    }
                    this._controls.selected[hdr].push({'boxID': box.id, 'value': value, 'selected': false});
                    box.onclick = (e) => {
                        //check for shift held and shift select
                        if (e.shiftKey && this._controls.lastClickedBox['boxID'] && this._controls.lastClickedBox['header'] === hdr) {
                            let index1 = -1;
                            let index2 = -1;
                            for (let i = 0; i < this._controls.selected[hdr].length; i++) {
                                const obj = this._controls.selected[hdr][i];
                                if (obj['boxID'] === box.id) {index2 = i}
                                if (obj['boxID'] === this._controls.lastClickedBox['boxID']) {index1 = i}
                            }
                            const box1Checked = this._controls.selected[hdr][index1]['selected'];
                            let boxes = [];
                            const unqValues = new Set();
                            for (let i = Math.min(index1, index2); i <= Math.max(index1, index2); i++) {
                                const oSelected = this._controls.selected[hdr][i];
                                unqValues.add(oSelected['selected']);
                                const bBox = document.getElementById(oSelected['boxID']);
                                boxes.push(bBox);
                            }
                            const newBool = (unqValues.size === 1) ? !box1Checked : box1Checked;
                            for (let i = Math.min(index1, index2); i <= Math.max(index1, index2); i++) {
                                const obj = this._controls.selected[hdr][i];
                                obj['selected'] = newBool;
                            }
                            for (const bBox of boxes) {
                                bBox.checked = newBool;
                            }
                        } else {
                            //toggle box
                            this._controls.lastClickedBox = {'boxID': box.id, 'header': hdr};
                            for (const obj of this._controls.selected[hdr]) {
                                if (obj['boxID'] === box.id) {
                                    obj['selected'] = box.checked;
                                    break;
                                }
                            }
                        }
                        document.getElementById(`selectColumn${hdr}`).innerHTML = `(${this.selectedCount(hdr)})`;
                    }
                    boxDiv.appendChild(box);
                    tblData.appendChild(boxDiv);
                }
                tblRow.appendChild(tblData);
            }

            //append row
            tbl.appendChild(tblRow);
            if (rowCount === this.config.paginate) {break}
        }
        //add footer
        const tfRow = document.createElement('tr');
        tfRow.style.cssText = '';
        const tblFoot = document.createElement('td');
        tblFoot.colSpan = colCount;
        if (this.flat.filtered.length === 0) {
            const tblFootR1 = document.createElement('div');
            tblFootR1.style.cssText = this.tableFooter.style.cssText;
            tblFootR1.style.display = 'flex';
            tblFootR1.style.flexDirection = 'row';
            tblFootR1.style.width = '100%';
            tblFootR1.style.maxWidth = containerWidth;
            tblFootR1.style.alignItems = 'center';
            tblFootR1.style.justifyContent = this.tableCaption.style.textAlign;
            tblFootR1.style.fontSize = 'small';
            tblFootR1.innerHTML = (this.objects.length === 0) ? 'Data set is empty' : 'Filter returned empty set';
            tblFoot.appendChild(tblFootR1);
        }
        if (this.flat.filtered.length > 0) {
            const tblFootR2 = document.createElement('div');
            tblFootR2.style.cssText = this.tableFooter.style.cssText;
            tblFootR2.style.display = 'flex';
            tblFootR2.style.flexDirection = 'row';
            tblFootR2.style.width = '100%';
            tblFootR2.style.maxWidth = containerWidth;
            tblFootR2.style.alignItems = 'center';
            tblFootR2.style.justifyContent = this.tableFooter.style.textAlign;
            tblFootR2.style.fontSize = 'small';
            const pageSize = document.createElement('a');
            pageSize.href = '#';
            pageSize.style.color = this.tableColors.clickColor;
            pageSize.innerHTML = `${rowCount} rows shown`
            pageSize.onclick = () => {
                const value = parseInt(prompt('Rows per page:'));
                if (this.isNumber(value)) {
                    this.config.paginate = value;
                    this.display(this._controls.containerID);
                }
            }
            tblFootR2.appendChild(pageSize);
            const f = this.flat.filtered.length;
            const t = this.objects.length;
            if (f !== t) {
                const filteredSize = document.createElement('a');
                filteredSize.innerHTML = `&nbsp;of ${f} filtered`;
                tblFootR2.appendChild(filteredSize)
            }
            const totalSize = document.createElement('a');
            totalSize.innerHTML = `&nbsp;of ${t} total`;
            tblFootR2.appendChild(totalSize);
            tblFoot.appendChild(tblFootR2);
        }

        tfRow.appendChild(tblFoot);
        tbl.appendChild(tfRow);
        //display
        while (!this.config.appendToTarget && container.firstChild) {
            container.removeChild(container.firstChild);
        }
        container.appendChild(tbl);
        this.toolTip.init();
        container.appendChild(this.toolTip.container);
    }
    //selectHeaders will show a table of all possible headers with a select field
    selectHeaders() {
        let objects = [];
        for (const key in this._controls.allKeys) {
            objects.push({'key': key, 'up': '&uarr;', 'down': '&darr;'});
        }
        const hdrTable = new ObjectTable('selectHeaders', objects);
        hdrTable.config.captionHTML = "Select Headers<br /><small>(none = all)</small>"
        hdrTable.config.keyForUID = 'key';
        hdrTable.config.headerOverrides = {'key': 'Header', 'up': 'Up', 'down': 'Down'};
        hdrTable.config.paginate = 0;
        hdrTable.config.hideHeaderSelect = true;
        hdrTable.config.hidePagination = true;
        hdrTable.config.showClose = true;
        hdrTable.config.funcClose = () => this.display(this._controls.containerID);
        hdrTable.config.links = {
            'up': {'keyOverride': 'key', 'func': (hdr) => {
                for (let i=0; i<objects.length; i++) {
                    if (objects[i]['key'] === hdr) {
                        if (i === 0) {break}
                        [objects[i], objects[i-1]] = [objects[i-1], objects[i]];
                        [hdrTable._controls.selected['Show'][i], hdrTable._controls.selected['Show'][i-1]] = [hdrTable._controls.selected['Show'][i-1], hdrTable._controls.selected['Show'][i]];
                        break;
                    }
                }
                reDisplay();
                }},
            'down': {'keyOverride': 'key', 'func': (hdr) => {
                for (let i=0; i<objects.length; i++) {
                    if (objects[i]['key'] === hdr) {
                        if (i === objects.length-1) {break}
                        [objects[i], objects[i+1]] = [objects[i+1], objects[i]];
                        [hdrTable._controls.selected['Show'][i], hdrTable._controls.selected['Show'][i+1]] = [hdrTable._controls.selected['Show'][i+1], hdrTable._controls.selected['Show'][i]];
                        break;
                    }
                }
                reDisplay();
                }}
        }
        hdrTable.config.multiSelect = {
            'Show': {'func': (keys) => {
                this.config.keysToShow = keys;
                this._controls.allKeys = {};
                this.display(this._controls.containerID);
            }}
        }
        hdrTable.display(this._controls.containerID);
        for (const obj of hdrTable._controls.selected['Show']) {
            obj['selected'] = (this._controls.allKeys[obj['value']]);
        }
        const reDisplay = () => {
            const selected = hdrTable._controls.selected;
            hdrTable.display(this._controls.containerID);
            hdrTable._controls.selected = selected;
            document.getElementById('thUp').innerHTML = '';
            document.getElementById('thDown').innerHTML = '';
            let totalHeaders = 0;
            let shownHeaders = 0;
            for (const obj of hdrTable._controls.selected['Show']) {
                totalHeaders++;
                document.getElementById(obj['boxID']).checked = obj['selected'];
                if (obj['selected']) {shownHeaders++}
            }
            document.getElementById('selectColumnShow').innerHTML = `(${shownHeaders})`;
            if (shownHeaders === totalHeaders) {
                document.getElementById('selectAllIconShow').src = hdrTable.imageSrc.selectNone;
                document.getElementById('selectAllIconShow').alt = 'select none';
                document.getElementById('selectAllIconShow').onclick = () => {hdrTable.selectNone('Show')};
            }
        }
        reDisplay();
    }
    //selectedCount will return the number of selected items for a given header
    selectedCount(sHdr) {
        let count = 0;
        for (const obj of this._controls.selected[sHdr]) {
            if (obj['selected']) {count++}
        }
        return count;
    }
    //selectAll / None will select all / none of the checkboxes for the given header
    selectAll(sHdr) {
        for (const obj of this._controls.selected[sHdr]) {
            obj['selected'] = true;
            document.getElementById(obj['boxID']).checked = true;
        }
        const icon = document.getElementById(`selectAllIcon${sHdr}`);
        icon.src = this.imageSrc.selectNone;
        icon.alt = 'select none';
        icon.onclick = () => {this.selectNone(sHdr)};
        icon.onmouseover = (e) => {this.toolTip.show(e, 'select none')};
        icon.onmouseout = () => {this.toolTip.hide()};
        document.getElementById(`selectColumn${sHdr}`).innerHTML = `(${this.selectedCount(sHdr)})`;
    }
    selectNone(sHdr) {
        for (const obj of this._controls.selected[sHdr]) {
            obj['selected'] = false;
            document.getElementById(obj['boxID']).checked = false;
        }
        const icon = document.getElementById(`selectAllIcon${sHdr}`);
        icon.src = this.imageSrc.selectAll;
        icon.alt = 'select all';
        icon.onclick = () => {this.selectAll(sHdr)};
        icon.onmouseover = (e) => {this.toolTip.show(e, 'select all')};
        document.getElementById(`selectColumn${sHdr}`).innerHTML = `(${this.selectedCount(sHdr)})`;
    }
    //downloadCSV will convert the objects table into CSV and send it to the client
    downloadCSV() {
        //set up container
        const container = document.getElementById(this._controls.containerID);
        const rect = container.getBoundingClientRect();
        const dlDiv = document.createElement('div');
        dlDiv.id = 'downloadCSVDiv';
        dlDiv.style.display = 'flex';
        dlDiv.style.flexDirection = 'row';
        dlDiv.style.justifyContent = 'center';
        dlDiv.style.position = 'absolute';
        dlDiv.style.top = `${rect.top + 6}px`;
        dlDiv.style.left = `${rect.left + 6}px`;
        dlDiv.style.width = '300px';
        dlDiv.style.backgroundColor = this.tableColors.toolTipBG;
        dlDiv.style.border = this.tableColors.toolTipBorder;
        dlDiv.style.borderRadius = this.tableColors.toolTipBorderRadius;
        dlDiv.style.padding = '10px';
        container.appendChild(dlDiv);
        //generate data for table
        let objects = [
            {'id': 'Use Header Names'},
            {'id': 'Use Current Filters'},
            {'id': 'Current Page Only'},
            {'id': 'Visible Columns Only'}
        ];
        //create table with links to download
        const dlTable = new ObjectTable('downloadCSVTable', objects);
        dlTable.config.captionHTML = `Download CSV`;
        dlTable.config.keyForUID = 'id';
        dlTable.config.headerOverrides = {'id': 'Options'};
        dlTable.config.paginate = 0;
        dlTable.config.hideHeaderSelect = true;
        dlTable.config.hidePagination = true;
        dlTable.config.showClose = true;
        dlTable.config.funcClose = () => {
            container.removeChild(dlDiv);
        }
        dlTable.config.multiSelect = {
            'Download': {'func': (options) => {
                container.removeChild(dlDiv);
                const fileName = prompt('File Name:', 'results.csv')
                let csvText = '';
                let rows = this.flat.all;
                if (options.includes('Current Page Only')) {
                    rows = this.flat.page;
                } else if (options.includes('Use Current Filters')) {
                    rows = this.flat.filtered;
                }
                //headers
                for (const [key, display] of Object.entries(this._controls.allKeys)) {
                    if (!display && options.includes('Visible Columns Only')) {continue}
                    let headerTxt = key;
                    if (this.config.headerOverrides.hasOwnProperty(key) && options.includes('Use Header Names')) {
                        headerTxt = this.config.headerOverrides[key];
                    }
                    //clean up
                    headerTxt = `${headerTxt}`.replace(/#/g, "|hash|");
                    headerTxt = `${headerTxt}`.replace(/"/g, "'");
                    csvText += `"${headerTxt}",`;
                }
                csvText = csvText.slice(0,-1) + '\n';
                //data
                for (const obj of rows) {
                    for (const [key, display] of Object.entries(this._controls.allKeys)) {
                        if (!display && options.includes('Visible Columns Only')) {continue}
                        //clean up
                        let value = `${obj[key]}`.replace(/#/g, "|hash|");
                        value = `${value}`.replace(/"/g, "'");
                        csvText += `"${value}",`;
                    }
                    csvText = csvText.slice(0,-1) + '\n';
                }
                //encode to DL file
                let csv = 'data:text/csv;charset=utf-8,';
                csv += csvText;
                let tmpLink = document.createElement('a');
                let data = encodeURI(csv);
                tmpLink.setAttribute('id', 'tmpLink');
                tmpLink.setAttribute('href', data);
                tmpLink.setAttribute('download', fileName);
                document.body.appendChild(tmpLink);
                tmpLink.click();
                document.body.removeChild(document.getElementById('tmpLink'));
            }}
        }
        dlTable.display('downloadCSVDiv');
    }
    //verify will do a sanity check on the entire config and error out if anything is amiss
    verify() {
        let fail = 0;
        if (!this.isString(this.name) || this.name === '') {
            fail += 1;
            console.error(`t.name is blank`);
        }
        if (!this.isArray(this.objects)) {
            fail += 1;
            console.error(`t.objects is not an array (empty is ok)`);
        } else {
            if (this.objects.length > 0 && !this.isObject(this.objects[0])) {
                fail += 1;
                console.error(`t.objects is not an array of objects (empty is ok)`);
            }
        }
        //populate order of keys and whether to show their columns
        if (Object.keys(this._controls.allKeys).length === 0) {
            //get all keys from objects array
            const allKeys = new Set();
            for (const object of this.objects) {
                for (const key in object) {
                    allKeys.add(key);
                }
            }
            //make sure any specified keys are present
            if (!this.isArray(this.config.keysToShow) || (this.config.keysToShow.length > 0 && !this.isString(this.config.keysToShow[0]))) {
                fail += 1;
                console.error(`t.config.keysToShow is not an array of strings (empty is ok)`);
            }
            for (const key of this.config.keysToShow) {
                if (!allKeys.has(key) && this.objects.length > 0) {
                    fail += 1;
                    console.error(`specified key ${key} is not a key in the provided objects`);
                }
            }
            //use our specified keys first to establish ordering
            let predefined = false;
            if (this.config.keysToShow) {
                for (const key of this.config.keysToShow) {
                    this._controls.allKeys[key] = true;
                    predefined = true;
                }
            }
            for (const key of allKeys) {
                if (!this._controls.allKeys.hasOwnProperty(key)) {
                    this._controls.allKeys[key] = !predefined;
                }
            }
        }
        if (Object.keys(this._controls.allKeys).length === 0) {
            fail += 1;
            console.error(`no object keys could be found in the provided objects`);
        }
        //check config elements
        if (!this.isString(this.config.keyForUID)) {
            fail += 1;
            console.error(`t.config.keyForUID is not a string`);
        }
        if (!this.isObject(this.config.headerOverrides)) {
            fail += 1;
            console.error(`t.config.headerOverrides is not an object`);
        } else {
            for (const [key, value] of Object.entries(this.config.headerOverrides)) {
                if (!this.isString(value)) {
                    fail += 1;
                    console.error(`t.config.headerOverrides[${key}] is not a string`);
                } else if (!this._controls.allKeys.hasOwnProperty(key)) {
                    fail += 1;
                    console.error(`t.config.headerOverrides[${key}] is not a key in the provided objects`);
                }
            }
        }
        if (!this.isString(this.config.captionHTML) || this.config.captionHTML === '') {
            fail += 1;
            console.error(`no caption text / html provided`);
        }
        if (!this.isBoolean(this.config.showRefresh)) {
            fail += 1;
            console.error(`t.config.showRefresh is not a boolean`);
        }
        if (this.config.showRefresh && !this.isFunction(this.config.funcRefresh)) {
            fail += 1;
            console.error(`no valid refresh function provided`);
        }
        if (!this.isBoolean(this.config.showClose)) {
            fail += 1;
            console.error(`t.config.showClose is not a boolean`);
        }
        if (this.config.showClose && !this.isFunction(this.config.funcClose)) {
            fail += 1;
            console.error(`no valid close function provided`);
        }
        if (!this.isBoolean(this.config.showAdd)) {
            fail += 1;
            console.error(`t.config.showAdd is not a boolean`);
        }
        if (this.config.showAdd && !this.isFunction(this.config.funcAdd)) {
            fail += 1;
            console.error(`no valid add function provided`);
        }
        if (!this.isBoolean(this.config.showCSV)) {
            fail += 1;
            console.error(`t.config.showCSV is not a boolean`);
        }
        if (!this.isArray(this.config.showFilterFor) || (this.config.showFilterFor.length > 0 && !this.isString(this.config.showFilterFor[0]))) {
            fail += 1;
            console.error(`t.config.showFilterFor is not an array of strings (empty is ok)`);
        }
        for (const key of this.config.showFilterFor) {
            if (!(this._controls.allKeys.hasOwnProperty(key) || key === '*')) {
                fail += 1;
                console.error(`specified key ${key} is not a key in the provided objects`);
            }
        }
        if (!this.isObject(this.config.filterValues)) {
            fail += 1;
            console.error(`t.config.filterValues is not an object`);
        } else {
            for (const [hdr, value] of Object.entries(this.config.filterValues)) {
                if (!(this.config.showFilterFor.includes(hdr) || this.config.showFilterFor.includes('*'))) {
                    fail += 1;
                    console.error(`filtered key ${hdr} is not marked in showFilterFor (won't be able to change filter)`);
                }
                if (!this.isString(value)) {
                    fail += 1;
                    console.error(`t.config.filterValues[${hdr}] is not a string`);
                } else if (!this._controls.allKeys.hasOwnProperty(hdr)) {
                    fail += 1;
                    console.error(`t.config.filterValues[${hdr}] is not a key in the provided objects`);
                }
            }
        }
        if (!this.isArray(this.config.showSortFor) || (this.config.showSortFor.length > 0 && !this.isString(this.config.showSortFor[0]))) {
            fail += 1;
            console.error(`t.config.showSortFor is not an array of strings (empty is ok)`);
        }
        for (const key of this.config.showSortFor) {
            if (!(this._controls.allKeys.hasOwnProperty(key) || key === '*')) {
                fail += 1;
                console.error(`specified key ${key} is not a key in the provided objects`);
            }
        }
        if (!this.isString(this.config.keyToSort)) {
            fail += 1;
            console.error(`t.config.keyToSort is not a string (empty is ok)`);
        }
        if (this.config.keyToSort && !this.config.keyToSort in this._controls.allKeys) {
            fail += 1;
            console.error(`t.config.keyToSort is not is not a key in the provided objects`);
        }
        if (!this.isBoolean(this.config.sortDescend)) {
            fail += 1;
            console.error(`t.config.sortDescend is not a boolean`);
        }
        if (!this.isObject(this.config.links)) {
            fail += 1;
            console.error(`t.config.links is not an object`);
        } else {
            for (const [hdr, oFuncKeyOverride] of Object.entries(this.config.links)) {
                if (!this.isObject(oFuncKeyOverride)) {
                    fail += 1;
                    console.error(`t.config.links[${hdr}] is not an object`);
                } else {
                    for (const [key, value] of Object.entries(Object(oFuncKeyOverride))) {
                        if (key === 'keyOverride' && !this.isString(value)) {
                            fail += 1;
                            console.error(`t.config.links[${hdr}][${key}] is not a string`);
                        } else if (key === 'func' && !this.isFunction(value)) {
                            fail += 1;
                            console.error(`t.config.links[${hdr}][${key}] is not a function`);
                        }
                    }
                    if (!oFuncKeyOverride.hasOwnProperty('func')) {
                        fail += 1;
                        console.error(`t.config.links[${hdr}] does not have a function assigned`);
                    }
                }
            }
        }
        if (!this.isObject(this.config.multiSelect)) {
            fail += 1;
            console.error(`t.config.multiSelect is not an object`);
        } else {
            for (const key in this.config.multiSelect) {
                if (!this.isObject(this.config.multiSelect[key])) {
                    fail += 1;
                    console.error(`t.config.multiSelect[${key}] is not an object`);
                } else {
                    for (const subKey in this.config.multiSelect[key]) {
                        if (subKey === 'keyOverride' && !this.isString(this.config.multiSelect[key][subKey])) {
                            fail += 1;
                            console.error(`t.config.multiSelect[${key}][${subKey}] is not a string`);
                        } else if (subKey === 'func' && !this.isFunction(this.config.multiSelect[key][subKey])) {
                            fail += 1;
                            console.error(`t.config.multiSelect[${key}][${subKey}] is not a function`);
                        }
                    }
                    if (!('func' in this.config.multiSelect[key])) {
                        fail += 1;
                        console.error(`t.config.multiSelect[${key}] does not have a function assigned`);
                    }
                    if (!this.config.multiSelect[key]['keyOverride'] && !this.config.keyForUID) {
                        fail += 1;
                        console.error(`t.config.multiSelect[${key}] does not have a key assigned, and keyForUID is not present`);
                    }
                }
            }
        }
        if (!this.isBoolean(this.config.hideInvalid)) {
            fail += 1;
            console.error(`t.config.hideInvalid is not a boolean`);
        }
        if (!this.isString(this.config.htmlTrue)) {
            fail += 1;
            console.error(`t.config.htmlTrue is not a string (empty is ok)`);
        }
        if (!this.isString(this.config.htmlFalse)) {
            fail += 1;
            console.error(`t.config.htmlFalse is not a string (empty is ok)`);
        }
        if (!this.isInteger(this.config.paginate)) {
            fail += 1;
            console.error(`t.config.paginate is not an integer (0 is ok)`);
        }
        if (!this.isArray(this.config.applyImagesTo) || (this.config.applyImagesTo.length > 0 && !this.isString(this.config.applyImagesTo[0]))) {
            fail += 1;
            console.error(`t.config.applyImagesTo is not an array of strings (empty is ok)`);
        }
        for (const key of this.config.applyImagesTo) {
            if (!this._controls.allKeys.hasOwnProperty(key)) {
                fail += 1;
                console.error(`specified key ${key} is not a key in the provided objects`);
            }
        }
        if (fail > 0) {
            let msg = `${fail} ${(fail===1)?'error':'errors'} prevented verification. See console for details`;
            throw(msg);
        }
    }
    isString(xVar) {
        return (xVar !== undefined && xVar !== null && typeof xVar === 'string');
    }
    isNumber(xVar) {
        return (xVar !== undefined && xVar !== null && Number.isFinite(xVar));
    }
    isInteger(xVar) {
        return (this.isNumber(xVar) && Number.isInteger(xVar));
    }
    isBoolean(xVar) {
        return (xVar !== undefined && xVar !== null && typeof xVar === 'boolean');
    }
    isArray(xVar) {
        return (xVar !== undefined && xVar !== null && xVar.constructor === Array && Array.isArray(xVar));
    }
    isObject(xVar) {
        return (xVar !== undefined && xVar !== null && !this.isArray(xVar) && typeof xVar === 'object' && xVar instanceof Object);
    }
    isFunction(xVar) {
        return (xVar !== undefined && xVar !== null && typeof xVar === 'function' && xVar instanceof Function);
    }
}