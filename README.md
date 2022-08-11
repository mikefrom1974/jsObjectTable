# ObjectTable
(Generate Table from array of objects)

This is a class written in vanilla Javascript.

It is intended to simplify pulling data from API endpoints and displaying that data to the end user.

---
Usage: import the objectTable.js into your HTML file. See index.html and demoTable.js for example usage.

Note: The Javascript file is heavily commented and not compressed for ease of modification. You probably want to compress it for a production environment.

---
## Change Log
(Semantic Versioning)

**dev**
* *Fixed*: pagination and header controls not showing
* *Fixed*: various layout issues
* *Fixed*: hiding pagination didn't hide pagination footer
* *Fixed*: some table settings not taking effect
* *Fixed*: false 'missing key' error on empty sets
* *Changed*: main table rows now have IDs for post-processing
* *Changed*: caption images no longer take up space when hidden
* *Added*: header link functions

**1.2.5**
* *Fixed*: sorting issues
* *Fixed*: empty sets from source throwing errors
* *fixed*: td newlines and tabs not showing properly

**1.2.1**
* *Fixed*: Undefined error in header select
* *Added*: Reorder headers

**1.1.0**
* *Added*: Shift-click multiselect on checkbox columns

**1.0.0**
* *Added*: Initial functionality

---
## ToDo:
* settings cog to change colors / style
* default color schemes (dark mode)
