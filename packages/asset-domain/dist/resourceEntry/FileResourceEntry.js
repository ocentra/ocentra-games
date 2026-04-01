var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import 'reflect-metadata';
import { serializable, serializableClass } from '../serialization/decorators.js';
import { AssetTypeCategory } from '../constants/assets.js';
import { ResourceEntry } from '../resourceEntry/ResourceEntry.js';
let FileResourceEntry = class FileResourceEntry extends ResourceEntry {
    fileType = '';
};
__decorate([
    serializable({ label: 'File Type' }),
    __metadata("design:type", String)
], FileResourceEntry.prototype, "fileType", void 0);
FileResourceEntry = __decorate([
    serializableClass({
        assetType: 'FileResourceEntry',
        displayName: 'File Resource Entry',
        icon: '📁',
        category: AssetTypeCategory.Content,
    })
], FileResourceEntry);
export { FileResourceEntry };
