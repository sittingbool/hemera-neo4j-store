"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const model_1 = require("./model");
class Neo4jResultParser {
    static parseResultObject(object) {
        return new model_1.Neo4JNodeModel(object);
    }
    static parseResultArray(array) {
        if (!Array.isArray(array)) {
            return array;
        }
        return array.map(item => {
            return this.parseResultObject(item);
        });
    }
    static parseRelationResultObject(object) {
        return new model_1.Neo4JRelationModel(object);
    }
    static parseRelationResultArray(array) {
        if (!Array.isArray(array)) {
            return array;
        }
        return array.map(item => {
            return this.parseRelationResultObject(item);
        });
    }
}
exports.Neo4jResultParser = Neo4jResultParser;
//# sourceMappingURL=result-parser.js.map