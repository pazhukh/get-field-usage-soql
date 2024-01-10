# Get SOQL of Reports or Dashboards where field is used

Commands

```
node main.js find
```

Attributes:
```
-p, --path      [required] Absolute path to Salesforce project 
-m, --metadata  [required] [choices: "report", "dashboard"] Metadata type
-o, --object    [required] Object API Name
-f, --field     [required] Field API Name
-s, --strict    [boolean]  Get only reports/dashboards where field is used in filters/grouping formulas
```

Example
```
node main.js find -p /Users/myUser/Salesforce/Projects/myProject -o delivery__c -m report -f complaint_code__c -s
```