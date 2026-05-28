import { localizer, t } from '../core/localizer';
import { utilSafeClassName } from '../util/util';


//
// `presetField` decorates a given `field` Object
// with some extra methods for searching and matching geometry
//
export function presetField(fieldID, field, allFields) {
  allFields = allFields || {};
  let _this = Object.assign({}, field);   // shallow copy

  _this.id = fieldID;

  // for use in classes, element ids, css selectors
  _this.safeid = utilSafeClassName(fieldID);

  _this.matchGeometry = (geom) => !_this.geometry || _this.geometry.indexOf(geom) !== -1;

  _this.matchAllGeometry = (geometries) => {
    return !_this.geometry || geometries.every(geom => _this.geometry.indexOf(geom) !== -1);
  };

  _this.t = (scope, options) => t(localizer.coalesceStringIds([`custom_presets.fields.${fieldID}.${scope}`,
                                                               `_tagging.presets.fields.${fieldID}.${scope}`]), options);
  _this.t.html = (scope, options) => t.html(localizer.coalesceStringIds([`custom_presets.fields.${fieldID}.${scope}`,
                                                                         `_tagging.presets.fields.${fieldID}.${scope}`]), options);
  _this.t.append = (scope, options) => t.append(localizer.coalesceStringIds([`custom_presets.fields.${fieldID}.${scope}`,
                                                                             `_tagging.presets.fields.${fieldID}.${scope}`]), options);
  _this.hasTextForStringId = (scope) => localizer.hasTextForStringId(`custom_presets.fields.${fieldID}.${scope}`) ||
    localizer.hasTextForStringId(`_tagging.presets.fields.${fieldID}.${scope}`);

  _this.resolveReference = which => {
    const referenceRegex = /^\{(.*)\}$/;
    const match = (field[which] || '').match(referenceRegex);
    if (match) {
      const field = allFields[match[1]];
      if (field) {
        return field;
      }
      console.error(`Unable to resolve referenced field: ${match[1]}`);  // eslint-disable-line no-console
    }
    return _this;
  };

    _this.title = () => {
      if (_this.overrideLabel) {
        return _this.overrideLabel;
      }
      if (field.index) {
        let baseLabel = _this.resolveReference('stringsCrossReference').t('label', { 'default': fieldID });
        let index = field.index.toLocaleString(localizer.localeCode());
        return t('inspector.indexed_field_label', {
          'default': `${baseLabel} (${index})`,
          field_name: baseLabel,
          index,
        });
      }
      return _this.resolveReference('label').t('label', { 'default': fieldID });
    };
    _this.label = () => {
      if (_this.overrideLabel) {
        return selection => selection.text(_this.overrideLabel);
      }
      if (field.index) {
        let baseLabel = _this.resolveReference('stringsCrossReference').t('label', { 'default': fieldID });
        let index = field.index.toLocaleString(localizer.localeCode());
        return t.append('inspector.indexed_field_label', {
          'default': `${baseLabel} (${index})`,
          field_name: baseLabel,
          index,
        });
      }
      return _this.resolveReference('label').t.append('label', { 'default': fieldID });
    };

  _this.placeholder = () => _this.resolveReference('placeholder').t('placeholder', { 'default': '' });

  _this.originalTerms = (_this.terms || []).join();

  _this.terms = () => _this.resolveReference('label').t('terms', { 'default': _this.originalTerms })
    .toLowerCase().trim().split(/\s*,+\s*/);

  _this.increment = (_this.type === 'number' || _this.type === 'integer') ? (_this.increment || 1) : undefined;

  /** all keys controlled by this field */
  _this.allKeys = () => {
    const allKeys = [];
    if (_this.key) allKeys.push(_this.key);
    if (_this.keys) allKeys.push(..._this.keys);
    return allKeys;
  };

  return _this;
}
