define([
    'underscore', 
    './util', 
    './StyleSheet', 
    './Worksheet',
    './RelationshipManager',
    './Paths'
], 
function (_, util, StyleSheet, Worksheet, RelationshipManager, Paths) {
    var Workbook = function (config) {
        this.worksheets = [];
        this.tables = [];
        this.initialize(config);
    };
    $.extend(true, Workbook.prototype, {

        initialize: function (config) {
            this.id = _.uniqueId('Workbook');
            this.styleSheet = new StyleSheet();

            this.relations = new RelationshipManager();
            this.relations.addRelation(this.styleSheet, 'stylesheet');
            this.relations.addRelation(this, 'spreadsheetml');
        },

        createWorksheet: function (config) {
            config = config || {}
            _.defaults(config, {
                name: 'Sheet '.concat(this.worksheets.length + 1)
            })
            return new Worksheet(config);
        },

        getStyleSheet: function () {
            return this.styleSheet;
        },

        addTable: function (table) {
            this.tables.push(table);
        },

        addWorksheet: function (worksheet) {
            this.relations.addRelation(worksheet, 'worksheet');
            this.worksheets.push(worksheet);
        },

        createContentTypes: function () {
            var doc = util.createXmlDoc(util.schemas.contentTypes, 'Types');
            var types = doc.documentElement;
            //doc.appendChild(types)
            types.appendChild(util.createElement(doc, 'Default', [
                ['Extension', "rels"],
                ['ContentType', "application/vnd.openxmlformats-package.relationships+xml"]
                ]));

            types.appendChild(util.createElement(doc, 'Default', [
                ['Extension', "xml"],
                ['ContentType', "application/xml"]
                ]));

            types.appendChild(util.createElement(doc, 'Override', [
                ['PartName', "/workbook.xml"],
                ['ContentType', "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"]
                ]));

            types.appendChild(util.createElement(doc, 'Override', [
                ['PartName', "/styles.xml"],
                ['ContentType', "application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"]
                ]));

            for(var i = 0, l = this.worksheets.length; i < l; i++) {
                types.appendChild(util.createElement(doc, 'Override', [
                    ['PartName', "/worksheets/sheet" + (i + 1) + ".xml"],
                    ['ContentType', "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"]
                    ]));
            }
            for(var i = 0, l = this.tables.length; i < l; i++) {
                types.appendChild(util.createElement(doc, 'Override', [
                    ['PartName', "/tables/table" + (i + 1) + ".xml"],
                    ['ContentType', "application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml"]
                    ]));
            }

            return doc;
        },

        toXML: function () {
            var doc = util.createXmlDoc(util.schemas.spreadsheetml, 'workbook');
            var wb = doc.documentElement;
            wb.setAttribute('xmlns:r', util.schemas.relationships);

            var sheets = util.createElement(doc, 'sheets');
            for(var i = 0, l = this.worksheets.length; i < l; i++) {
                var sheet = doc.createElement('sheet');
                sheet.setAttribute('name', this.worksheets[i].name);
                sheet.setAttribute('sheetId', i + 1);
                sheet.setAttribute('r:id', this.relations.getRelationshipId(this.worksheets[i]))
                sheets.appendChild(sheet);
            }
            wb.appendChild(sheets);
            return doc;
        },

        createWorkbookRelationship: function () {
            var doc = util.createXmlDoc(util.schemas.relationshipPackage, 'Relationships');
            var relationships = doc.documentElement;
            relationships.appendChild(util.createElement(doc, 'Relationship', [
                ['Id', 'rId1'],
                ['Type', util.schemas.officeDocument],
                ['Target', 'workbook.xml']
                ]));
            return doc;
        },

        createWorksheetRelationships: function () {

        },

        generateFiles: function () {
            Paths[this.styleSheet.id] = '/styles.xml';
            Paths[this.id] = '/workbook.xml';
            var files = {};
            for(var i = 0, l = this.tables.length; i < l; i++) {
                files['/tables/table' + (i + 1) + '.xml'] = this.tables[i].toXML();
                Paths[this.tables[i].id] = '/tables/table' + (i + 1) + '.xml';
            }
            for(var i = 0, l = this.worksheets.length; i < l; i++) {
                files['/worksheets/sheet' + (i + 1) + '.xml'] = this.worksheets[i].toXML();
                Paths[this.worksheets[i].id] = '/worksheets/sheet' + (i + 1) + '.xml';
                files['/worksheets/_rels/sheet' + (i + 1) + '.xml.rels'] = this.worksheets[i].relations.toXML();

            }

            _.extend(files, {
                '/[Content_Types].xml': this.createContentTypes(),
                '/_rels/.rels': this.createWorkbookRelationship(),
                '/styles.xml': this.styleSheet.toXML(),
                '/workbook.xml': this.toXML(),
                '/_rels/workbook.xml.rels': this.relations.toXML()
            });

            _.each(files, function (value, key) {
                files[key] = value.xml || new XMLSerializer().serializeToString(value);  
                var content = files[key].replace(/xmlns=""/g, '');
                content = content.replace(/NS[\d]+:/g, '');
                content = content.replace(/xmlns:NS[\d]+=""/g, '');
                files[key] = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' + "\n" + content;
            });

            return files;
        }
    });
    return Workbook;
});