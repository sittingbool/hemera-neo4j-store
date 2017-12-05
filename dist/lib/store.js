"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Neo4JLib = require("neo4j-driver");
const Neo4J = Neo4JLib.v1;
const Store = require("hemera-store");
const Joi = require("joi");
const pattern_1 = require("./pattern");
const query_helper_1 = require("./query-helper");
const result_parser_1 = require("./result-parser");
class Neo4JStore extends Store {
    constructor(driver) {
        super(driver, {});
        this._session = null;
    }
    get session() {
        if (this._session) {
            return this._session;
        }
        this._session = this.driver.session();
        return this._session;
    }
    create(req, cb) {
        let _record = null;
        let labels = req.labels || [];
        let data = req.data || {};
        if (labels.length < 1) {
            labels = ['UNKNOWN'];
        }
        let labelString = query_helper_1.CypherQueryHelper.generateLabelQueryString(labels);
        let dataString = query_helper_1.CypherQueryHelper.generatePropertiesQueryString(data);
        this.session.run(`CREATE (n${labelString} ${dataString}) RETURN n`, data)
            .subscribe({
            onNext: (record) => {
                _record = record.toObject();
            },
            onCompleted: () => {
                this.session.close();
                this._session = null;
                if (!_record) {
                    return cb(null, _record);
                }
                let item = result_parser_1.Neo4jResultParser.parseResultObject(_record.n || {});
                cb(null, item);
            },
            onError: (error) => {
                cb(error, null);
            }
        });
    }
    remove(req, cb) {
        let _record = null;
        let labels = req.labels || null;
        let data = req.query || null;
        let labelString = '';
        let dataString = '';
        if (labels && labels.length) {
            labelString = query_helper_1.CypherQueryHelper.generateLabelQueryString(labels);
        }
        if (data && typeof data === 'object') {
            dataString = ' ' + query_helper_1.CypherQueryHelper.generatePropertiesQueryString(data);
        }
        let query = `MATCH (n${labelString}${dataString}) DELETE n RETURN COUNT(n) as count`;
        let result;
        if (data) {
            result = this.session.run(query, data);
        }
        else {
            result = this.session.run(query);
        }
        result.subscribe({
            onNext: (record) => {
                _record = record.toObject();
            },
            onCompleted: () => {
                this.session.close();
                this._session = null;
                let count = _record.count || 0;
                if (Neo4J.isInt(count)) {
                    count = Neo4J.integer.toNumber(count);
                }
                cb(null, count || 0);
            },
            onError: (error) => {
                cb(error, null);
            }
        });
    }
    removeById(req, cb) {
        let _record = null;
        let id = req.id;
        let startStatement = query_helper_1.CypherQueryHelper.startStatementForId(id);
        let query = `${startStatement} DELETE n RETURN COUNT(n) as count`;
        this.session.run(query)
            .subscribe({
            onNext: (record) => {
                _record = record.toObject();
            },
            onCompleted: () => {
                this.session.close();
                this._session = null;
                let count = _record.count || 0;
                if (Neo4J.isInt(count)) {
                    count = Neo4J.integer.toNumber(count);
                }
                cb(null, count || 0);
            },
            onError: (error) => {
                cb(error, null);
            }
        });
    }
    update(req, cb) {
        let _records = [];
        let labels = req.labels || null;
        let data = req.data || {};
        let query = req.query || null;
        let labelString = '';
        let queryString = '';
        let dataString = ' ' + query_helper_1.CypherQueryHelper.generatePropertiesQueryString(data);
        if (labels && labels.length) {
            labelString = query_helper_1.CypherQueryHelper.generateLabelQueryString(labels);
        }
        if (query && typeof query === 'object') {
            queryString = ' ' + query_helper_1.CypherQueryHelper.generatePropertiesMatchString(query);
        }
        let cypherQuery = `MATCH (n${labelString}${queryString}) SET n += ${dataString} RETURN n`;
        this.session.run(cypherQuery, data).subscribe({
            onNext: (record) => {
                let _record = record.toObject();
                if (_record && _record.n) {
                    _records.push(_record.n);
                }
            },
            onCompleted: () => {
                this.session.close();
                this._session = null;
                let items = result_parser_1.Neo4jResultParser.parseResultArray(_records || []);
                switch (items.length) {
                    case 0:
                        items = null;
                        break;
                    case 1:
                        items = items[0];
                        break;
                    default:
                        break;
                }
                cb(null, items);
            },
            onError: (error) => {
                cb(error, null);
            }
        });
    }
    updateById(req, cb) {
        let _record = null;
        let id = req.id;
        let startStatement = query_helper_1.CypherQueryHelper.startStatementForId(id);
        let data = req.data || {};
        let dataString = ' ' + query_helper_1.CypherQueryHelper.generatePropertiesQueryString(data);
        let cypherQuery = `${startStatement} SET n += ${dataString} RETURN n`;
        this.session.run(cypherQuery, data).subscribe({
            onNext: (record) => {
                _record = record.toObject();
            },
            onCompleted: () => {
                this.session.close();
                this._session = null;
                if (!_record) {
                    return cb(null, _record);
                }
                let item = result_parser_1.Neo4jResultParser.parseResultObject(_record.n || {});
                cb(null, item);
            },
            onError: (error) => {
                cb(error, null);
            }
        });
    }
    find(req, cb) {
        let _records = [];
        let labels = req.labels || null;
        let query = req.query || null;
        let options = req.options || null;
        let labelString = '';
        let queryString = '';
        let optionsString = '';
        if (options && typeof options === "object" &&
            typeof options.limit === "number" && options.limit === 0) {
            return cb(null, null);
        }
        if (labels && labels.length) {
            labelString = query_helper_1.CypherQueryHelper.generateLabelQueryString(labels);
        }
        if (query && typeof query === 'object') {
            queryString = ' ' + query_helper_1.CypherQueryHelper.generatePropertiesMatchString(query);
        }
        if (options) {
            optionsString = query_helper_1.CypherQueryHelper.generateOptionsString(options);
        }
        let cypherQuery = `MATCH (n${labelString}${queryString}) RETURN n${optionsString}`;
        this.session.run(cypherQuery).subscribe({
            onNext: (record) => {
                let _record = record.toObject();
                if (_record && _record.n) {
                    _records.push(_record.n);
                }
            },
            onCompleted: () => {
                this.session.close();
                this._session = null;
                let items = result_parser_1.Neo4jResultParser.parseResultArray(_records || []);
                cb(null, items);
            },
            onError: (error) => {
                cb(error, null);
            }
        });
    }
    findById(req, cb) {
        let _record = null;
        let id = req.id;
        let whereStatement = query_helper_1.CypherQueryHelper.whereStatementForId(id);
        let cypherQuery = `MATCH (n) ${whereStatement} RETURN n`;
        this.session.run(cypherQuery).subscribe({
            onNext: (record) => {
                _record = record.toObject();
            },
            onCompleted: () => {
                this.session.close();
                this._session = null;
                if (!_record) {
                    return cb(null, _record);
                }
                let item = result_parser_1.Neo4jResultParser.parseResultObject(_record.n || {});
                cb(null, item);
            },
            onError: (error) => {
                cb(error, null);
            }
        });
    }
    replace(req, cb) {
        let _records = [];
        let labels = req.labels || null;
        let data = req.data || {};
        let query = req.query || null;
        let labelString = '';
        let queryString = '';
        let dataString = ' ' + query_helper_1.CypherQueryHelper.generatePropertiesQueryString(data);
        if (labels && labels.length) {
            labelString = query_helper_1.CypherQueryHelper.generateLabelQueryString(labels);
        }
        if (query && typeof query === 'object') {
            queryString = ' ' + query_helper_1.CypherQueryHelper.generatePropertiesMatchString(query);
        }
        let cypherQuery = `MATCH (n${labelString}${queryString}) SET n = ${dataString} RETURN n`;
        this.session.run(cypherQuery, data).subscribe({
            onNext: (record) => {
                let _record = record.toObject();
                if (_record && _record.n) {
                    _records.push(_record.n);
                }
            },
            onCompleted: () => {
                this.session.close();
                this._session = null;
                let items = result_parser_1.Neo4jResultParser.parseResultArray(_records || []);
                switch (items.length) {
                    case 0:
                        items = null;
                        break;
                    case 1:
                        items = items[0];
                        break;
                    default:
                        break;
                }
                cb(null, items);
            },
            onError: (error) => {
                cb(error, null);
            }
        });
    }
    replaceById(req, cb) {
        let _record = null;
        let id = req.id;
        let startStatement = query_helper_1.CypherQueryHelper.startStatementForId(id);
        let data = req.data || {};
        let dataString = ' ' + query_helper_1.CypherQueryHelper.generatePropertiesQueryString(data);
        let cypherQuery = `${startStatement} SET n = ${dataString} RETURN n`;
        this.session.run(cypherQuery, data).subscribe({
            onNext: (record) => {
                _record = record.toObject();
            },
            onCompleted: () => {
                this.session.close();
                this._session = null;
                if (!_record) {
                    return cb(null, _record);
                }
                let item = result_parser_1.Neo4jResultParser.parseResultObject(_record.n || {});
                cb(null, item);
            },
            onError: (error) => {
                cb(error, null);
            }
        });
    }
    exists(req, cb) {
        let id = req.id || null;
        let query = req.query || null;
        let labels = req.labels || null;
        if (typeof id === "string" && !isNaN(parseInt(id))) {
            id = parseInt(id);
        }
        if (typeof id === 'number' && id >= 0) {
            return this.findById({ id: id }, (err, res) => {
                let exists;
                if (err) {
                    return cb(err, null);
                }
                exists = typeof res === 'object' && res !== null;
                cb(err, exists);
            });
        }
        if ((query && typeof query === 'object' && Object.keys(query).length > 0) ||
            (Array.isArray(labels) && labels.length > 0)) {
            return this.find({ labels: labels, query: query, options: { limit: 1 } }, (err, res) => {
                let exists;
                if (err) {
                    return cb(err, null);
                }
                exists = Array.isArray(res) && res.length > 0;
                cb(err, exists);
            });
        }
        cb({ name: 'neo4j-exists-error', message: 'No ID or query or labels given, can not check for existence' }, false);
    }
    compileMatchStatementForEndPoint(endPoint, matches, startStatement, queryVar = 'n', useWhereForIds = false) {
        let result = queryVar;
        if (typeof endPoint.id !== 'undefined') {
            if (useWhereForIds) {
                matches.push(result);
                return startStatement;
            }
            startStatement += query_helper_1.CypherQueryHelper.startStatementForId(endPoint.id, queryVar);
        }
        else {
            if (Array.isArray(endPoint.labels)) {
                result += query_helper_1.CypherQueryHelper.generateLabelQueryString(endPoint.labels);
            }
            if (Object.keys(endPoint).length > 0) {
                result += ' ' + query_helper_1.CypherQueryHelper.generatePropertiesMatchString(endPoint.query);
            }
            matches.push(result);
        }
        return startStatement;
    }
    compileMatchStatementForRelation(type, query, endPoints) {
        let propertyString = '', fromPoint, toPoint, labelString = '';
        if (query && typeof query === 'object') {
            propertyString = ' ' + query_helper_1.CypherQueryHelper.generatePropertiesQueryString(query);
        }
        if (endPoints.fromIsDefined) {
            fromPoint = '(n)';
        }
        else {
            fromPoint = '()';
        }
        if (endPoints.toIsDefined) {
            toPoint = '(m)';
        }
        else {
            toPoint = '()';
        }
        if (!endPoints.anyDirection && (endPoints.fromIsDefined || endPoints.toIsDefined)) {
            toPoint = '>' + toPoint;
        }
        if (type && typeof type === 'string' && type.length > 0) {
            labelString = query_helper_1.CypherQueryHelper.generateLabelQueryString([type]);
        }
        return `${fromPoint}-[r${labelString}${propertyString}]-${toPoint}`;
    }
    createRelatedEndPointsQuery(from, to, anyDirection, useWhereForIds = false) {
        let matches = [], matchString;
        let result = {
            queryString: '',
            fromIsDefined: true,
            toIsDefined: true,
            anyDirection: anyDirection,
            error: null
        };
        let startStatement = '', whereStatement = '';
        if (from && typeof from === 'object') {
            startStatement =
                this.compileMatchStatementForEndPoint(from, matches, startStatement, 'n', useWhereForIds);
            if (useWhereForIds && from.id && !pattern_1.IDScheme.validate(from.id).error) {
                whereStatement += ' ' + query_helper_1.CypherQueryHelper.whereStatementForId(from.id, 'n');
            }
        }
        else {
            result.fromIsDefined = false;
        }
        if (to && typeof to === 'object') {
            startStatement =
                this.compileMatchStatementForEndPoint(to, matches, startStatement, 'm', useWhereForIds);
            if (useWhereForIds && to.id && !pattern_1.IDScheme.validate(to.id).error) {
                if (whereStatement.length > 0) {
                    whereStatement += ' AND';
                }
                whereStatement += ' ' + query_helper_1.CypherQueryHelper.whereStatementForId(to.id, 'm');
            }
        }
        else {
            result.toIsDefined = false;
        }
        matchString = query_helper_1.CypherQueryHelper.matchStatement(matches);
        if (matchString.length) {
            matchString = ' ' + matchString;
        }
        if (whereStatement.length > 0) {
            whereStatement = ' WHERE' + whereStatement;
        }
        let cypherQuery = `${startStatement}${matchString}${whereStatement}`;
        cypherQuery =
            cypherQuery.replace(')START', '), ');
        cypherQuery =
            cypherQuery.replace(/WHERE id\(/g, 'id(');
        result.queryString = cypherQuery;
        return result;
    }
    createRelation(req, cb) {
        let _records = [];
        let from = req.from;
        let type = req.type;
        let to = req.to;
        let data = req.data;
        let endPointQuery = this.createRelatedEndPointsQuery(from, to, null);
        let matchQuery = endPointQuery.queryString;
        let relationStatement = this.compileMatchStatementForRelation(type, data, endPointQuery);
        let cypherQuery = `${matchQuery} CREATE ${relationStatement} RETURN r`;
        this.session.run(cypherQuery, data).subscribe({
            onNext: (record) => {
                let _record = record.toObject();
                if (_record && _record.r) {
                    _records.push(_record.r);
                }
            },
            onCompleted: () => {
                this.session.close();
                this._session = null;
                let items = result_parser_1.Neo4jResultParser.parseRelationResultArray(_records || []);
                cb(null, items);
            },
            onError: (error) => {
                cb(error, null);
            }
        });
    }
    updateRelation(req, cb) {
        let _records = [];
        let from = req.from;
        let type = req.type;
        let to = req.to;
        let anyDirection = req.anyDirection || false;
        let query = req.query;
        let data = req.data || {};
        let dataString = ' ' + query_helper_1.CypherQueryHelper.generatePropertiesMatchString(data);
        let endPointQuery = this.createRelatedEndPointsQuery(from, to, anyDirection);
        let matchQuery = endPointQuery.queryString;
        let relationStatement = this.compileMatchStatementForRelation(type, query, endPointQuery);
        let relMatchQuery = query_helper_1.CypherQueryHelper.makeStatementForRelationMatch(matchQuery, relationStatement);
        let cypherQuery = `${relMatchQuery} SET r += ${dataString} RETURN r`;
        this.session.run(cypherQuery, query).subscribe({
            onNext: (record) => {
                let _record = record.toObject();
                if (_record && _record.r) {
                    _records.push(_record.r);
                }
            },
            onCompleted: () => {
                this.session.close();
                this._session = null;
                let items = result_parser_1.Neo4jResultParser.parseRelationResultArray(_records || []);
                cb(null, items);
            },
            onError: (error) => {
                cb(error, null);
            }
        });
    }
    updateRelationById(req, cb) {
        let _record = null;
        let id = req.id;
        let startStatement = query_helper_1.CypherQueryHelper.startStatementForRelId(id);
        let data = req.data || {};
        let dataString = ' ' + query_helper_1.CypherQueryHelper.generatePropertiesQueryString(data);
        let cypherQuery = `${startStatement} SET r += ${dataString} RETURN r`;
        this.session.run(cypherQuery, data).subscribe({
            onNext: (record) => {
                _record = record.toObject();
            },
            onCompleted: () => {
                this.session.close();
                this._session = null;
                if (!_record) {
                    return cb(null, _record);
                }
                let item = result_parser_1.Neo4jResultParser.parseRelationResultObject(_record.r || {});
                cb(null, item);
            },
            onError: (error) => {
                cb(error, null);
            }
        });
    }
    replaceRelation(req, cb) {
        let _records = [];
        let from = req.from;
        let type = req.type;
        let to = req.to;
        let anyDirection = req.anyDirection || false;
        let query = req.query;
        let data = req.data || {};
        let dataString = ' ' + query_helper_1.CypherQueryHelper.generatePropertiesMatchString(data);
        let endPointQuery = this.createRelatedEndPointsQuery(from, to, anyDirection);
        let matchQuery = endPointQuery.queryString;
        let relationStatement = this.compileMatchStatementForRelation(type, query, endPointQuery);
        let relMatchQuery = query_helper_1.CypherQueryHelper.makeStatementForRelationMatch(matchQuery, relationStatement);
        let cypherQuery = `${relMatchQuery} SET r = ${dataString} RETURN r`;
        this.session.run(cypherQuery, query).subscribe({
            onNext: (record) => {
                let _record = record.toObject();
                if (_record && _record.r) {
                    _records.push(_record.r);
                }
            },
            onCompleted: () => {
                this.session.close();
                this._session = null;
                let items = result_parser_1.Neo4jResultParser.parseRelationResultArray(_records || []);
                cb(null, items);
            },
            onError: (error) => {
                cb(error, null);
            }
        });
    }
    replaceRelationById(req, cb) {
        let _record = null;
        let id = req.id;
        let startStatement = query_helper_1.CypherQueryHelper.startStatementForRelId(id);
        let data = req.data || {};
        let dataString = ' ' + query_helper_1.CypherQueryHelper.generatePropertiesQueryString(data);
        let cypherQuery = `${startStatement} SET r = ${dataString} RETURN r`;
        this.session.run(cypherQuery, data).subscribe({
            onNext: (record) => {
                _record = record.toObject();
            },
            onCompleted: () => {
                this.session.close();
                this._session = null;
                if (!_record) {
                    return cb(null, _record);
                }
                let item = result_parser_1.Neo4jResultParser.parseRelationResultObject(_record.r || {});
                cb(null, item);
            },
            onError: (error) => {
                cb(error, null);
            }
        });
    }
    removeRelation(req, cb) {
        let _record = null;
        let from = req.from;
        let type = req.type;
        let to = req.to;
        let anyDirection = req.anyDirection || false;
        let query = req.query;
        let endPointQuery = this.createRelatedEndPointsQuery(from, to, anyDirection);
        let matchQuery = endPointQuery.queryString;
        let relationStatement = this.compileMatchStatementForRelation(type, query, endPointQuery);
        let relMatchQuery = query_helper_1.CypherQueryHelper.makeStatementForRelationMatch(matchQuery, relationStatement);
        let cypherQuery = `${relMatchQuery} DELETE r RETURN COUNT(r) as count`;
        this.session.run(cypherQuery, query).subscribe({
            onNext: (record) => {
                _record = record.toObject();
            },
            onCompleted: () => {
                this.session.close();
                this._session = null;
                let count = _record.count || 0;
                if (Neo4J.isInt(count)) {
                    count = Neo4J.integer.toNumber(count);
                }
                cb(null, count || 0);
            },
            onError: (error) => {
                cb(error, null);
            }
        });
    }
    removeRelationById(req, cb) {
        let _record = null;
        let id = req.id;
        let startStatement = query_helper_1.CypherQueryHelper.startStatementForRelId(id);
        let cypherQuery = `${startStatement} DELETE r RETURN COUNT(r) as count`;
        this.session.run(cypherQuery).subscribe({
            onNext: (record) => {
                _record = record.toObject();
            },
            onCompleted: () => {
                this.session.close();
                this._session = null;
                let count = _record.count || 0;
                if (Neo4J.isInt(count)) {
                    count = Neo4J.integer.toNumber(count);
                }
                cb(null, count || 0);
            },
            onError: (error) => {
                cb(error, null);
            }
        });
    }
    findRelation(req, cb) {
        let _records = [];
        let from = req.from;
        let type = req.type;
        let options = req.options;
        let to = req.to;
        let anyDirection = req.anyDirection || false;
        let query = req.query;
        let optionsString = '';
        if (options && typeof options === "object" &&
            typeof options.limit === "number" && options.limit === 0) {
            return cb(null, null);
        }
        let endPointQuery = this.createRelatedEndPointsQuery(from, to, anyDirection, true);
        let matchQuery = endPointQuery.queryString;
        let relationStatement = this.compileMatchStatementForRelation(type, query, endPointQuery);
        if (options) {
            optionsString = query_helper_1.CypherQueryHelper.generateOptionsString(options, 'r');
        }
        let relMatchQuery = query_helper_1.CypherQueryHelper.makeStatementForRelationMatch(matchQuery, relationStatement);
        let cypherQuery = `${relMatchQuery} RETURN DISTINCT r${optionsString}`;
        this.session.run(cypherQuery, query).subscribe({
            onNext: (record) => {
                let _record = record.toObject();
                if (_record && _record.r) {
                    _records.push(_record.r);
                }
            },
            onCompleted: () => {
                this.session.close();
                this._session = null;
                let items = result_parser_1.Neo4jResultParser.parseRelationResultArray(_records || []);
                cb(null, items);
            },
            onError: (error) => {
                cb(error, null);
            }
        });
    }
    findRelationStartNodes(req, cb) {
        let _records = [];
        let type = req.type;
        let options = req.options;
        let to = req.to;
        let query = req.query;
        let optionsString = '';
        if (options && typeof options === "object" &&
            typeof options.limit === "number" && options.limit === 0) {
            return cb(null, null);
        }
        let endPointQuery = this.createRelatedEndPointsQuery({}, to, false);
        let matchQuery = endPointQuery.queryString;
        let relationStatement = this.compileMatchStatementForRelation(type, query, endPointQuery);
        if (options) {
            optionsString = query_helper_1.CypherQueryHelper.generateOptionsString(options, 'n');
        }
        let relMatchQuery = query_helper_1.CypherQueryHelper.makeStatementForRelationMatch(matchQuery, relationStatement, false);
        relMatchQuery = relMatchQuery.replace('(n), ', '');
        let cypherQuery = `${relMatchQuery} RETURN DISTINCT n${optionsString}`;
        this.session.run(cypherQuery, query).subscribe({
            onNext: (record) => {
                let _record = record.toObject();
                if (_record && _record.n) {
                    _records.push(_record.n);
                }
            },
            onCompleted: () => {
                this.session.close();
                this._session = null;
                let items = result_parser_1.Neo4jResultParser.parseResultArray(_records || []);
                cb(null, items);
            },
            onError: (error) => {
                cb(error, null);
            }
        });
    }
    findRelationEndNodes(req, cb) {
        let _records = [];
        let type = req.type;
        let options = req.options;
        let from = req.from;
        let query = req.query;
        let optionsString = '';
        if (options && typeof options === "object" &&
            typeof options.limit === "number" && options.limit === 0) {
            return cb(null, null);
        }
        let endPointQuery = this.createRelatedEndPointsQuery(from, {}, false);
        let matchQuery = endPointQuery.queryString;
        let relationStatement = this.compileMatchStatementForRelation(type, query, endPointQuery);
        if (options) {
            optionsString = query_helper_1.CypherQueryHelper.generateOptionsString(options, 'm');
        }
        let relMatchQuery = query_helper_1.CypherQueryHelper.makeStatementForRelationMatch(matchQuery, relationStatement, false);
        relMatchQuery = relMatchQuery.replace('(m), ', '');
        let cypherQuery = `${relMatchQuery} RETURN DISTINCT m${optionsString}`;
        this.session.run(cypherQuery, query).subscribe({
            onNext: (record) => {
                let _record = record.toObject();
                if (_record && _record.m) {
                    _records.push(_record.m);
                }
            },
            onCompleted: () => {
                this.session.close();
                this._session = null;
                let items = result_parser_1.Neo4jResultParser.parseResultArray(_records || []);
                cb(null, items);
            },
            onError: (error) => {
                cb(error, null);
            }
        });
    }
    findNodesOnRelation(req, cb) {
        let _records = [];
        let type = req.type;
        let options = req.options;
        let anyNode = req.anyNode || null;
        let query = req.query;
        let optionsString = '';
        if (options && typeof options === "object" &&
            typeof options.limit === "number" && options.limit === 0) {
            return cb(null, null);
        }
        let endPointQuery = this.createRelatedEndPointsQuery({}, anyNode, true);
        let matchQuery = endPointQuery.queryString;
        let relationStatement = this.compileMatchStatementForRelation(type, query, endPointQuery);
        if (options) {
            optionsString = query_helper_1.CypherQueryHelper.generateOptionsString(options, 'n');
        }
        let relMatchQuery = query_helper_1.CypherQueryHelper.makeStatementForRelationMatch(matchQuery, relationStatement, false);
        relMatchQuery = relMatchQuery.replace('(n), (m), ', '');
        relMatchQuery = relMatchQuery.replace('(n), ', '');
        let cypherQuery = `${relMatchQuery} RETURN DISTINCT n${optionsString}`;
        this.session.run(cypherQuery, query).subscribe({
            onNext: (record) => {
                let _record = record.toObject();
                if (_record && _record.n) {
                    _records.push(_record.n);
                }
            },
            onCompleted: () => {
                this.session.close();
                this._session = null;
                let items = result_parser_1.Neo4jResultParser.parseResultArray(_records || []);
                cb(null, items);
            },
            onError: (error) => {
                cb(error, null);
            }
        });
    }
    findRelationById(req, cb) {
        let _record = null;
        let id = req.id;
        let whereStatement = query_helper_1.CypherQueryHelper.whereStatementForId(id, 'r');
        let cypherQuery = `MATCH ()-[r]-() ${whereStatement} RETURN DISTINCT r`;
        this.session.run(cypherQuery).subscribe({
            onNext: (record) => {
                _record = record.toObject();
            },
            onCompleted: () => {
                this.session.close();
                this._session = null;
                if (!_record) {
                    return cb(null, _record);
                }
                let item = result_parser_1.Neo4jResultParser.parseRelationResultObject(_record.r || {});
                cb(null, item);
            },
            onError: (error) => {
                cb(error, null);
            }
        });
    }
    relationExists(req, cb) {
        let id = req.id || null;
        let from = req.from;
        let to = req.to;
        let type = req.type || null, validationFrom, validationTo, query;
        if (typeof id === "string" && !isNaN(parseInt(id))) {
            id = parseInt(id);
        }
        if (typeof id === 'number' && id >= 0) {
            return this.findRelationById({ id: id }, (err, res) => {
                let exists;
                if (err) {
                    return cb(err, null);
                }
                exists = typeof res === 'object' && res !== null;
                cb(err, exists);
            });
        }
        validationFrom = Joi.validate(from, pattern_1.RelatedNodeScheme);
        validationTo = Joi.validate(to, pattern_1.RelatedNodeScheme);
        if ((type && typeof type === 'string' && type.length > 0) ||
            !validationFrom.error || !validationTo.error) {
            query = { type: type, from: from, to: to, anyDirection: req.anyDirection, options: { limit: 1 } };
            return this.findRelation(query, (err, res) => {
                let exists;
                if (err) {
                    return cb(err, null);
                }
                exists = Array.isArray(res) && res.length > 0;
                cb(err, exists);
            });
        }
        cb({ name: 'neo4j-exists-error', message: 'No ID or query or type given, can not check for existence' }, false);
    }
    executeCypherQuery(req, cb) {
        let parameters = req.parameters || null;
        let cypherQuery = req.query;
        let records = [];
        let observable;
        if (parameters) {
            observable = this.session.run(cypherQuery, parameters);
        }
        else {
            observable = this.session.run(cypherQuery);
        }
        observable.subscribe({
            onNext: (record) => {
                records.push(record.toObject());
            },
            onCompleted: () => {
                this.session.close();
                this._session = null;
                cb(null, records);
            },
            onError: (error) => {
                cb(error, null);
            }
        });
    }
}
exports.Neo4JStore = Neo4JStore;
//# sourceMappingURL=store.js.map