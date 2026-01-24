import { dispatch as d3_dispatch } from 'd3-dispatch';
import { select as d3_select } from 'd3-selection';

import { svgIcon } from '../../svg';
import { uiTooltip } from '../tooltip';
import { uiCombobox } from '../combobox';
import { t, localizer } from '../../core/localizer';
import { utilGetSetValue, utilNoAuto, utilRebind, utilUniqueDomId } from '../../util';


export function uiFieldDate(field, context) {
    let dispatch = d3_dispatch('change');
    let yearInput = d3_select(null);
    let eraInput = d3_select(null);
    let monthInput = d3_select(null);
    let dayInput = d3_select(null);
    let edtfInput = d3_select(null);
    let _entityIDs = [];
    let _tags;
    let _selection = d3_select(null);
    let _edtfValue;

    let edtfKey = field.key + ':edtf';

    let dateTimeFormat = new Intl.DateTimeFormat(localizer.localeCodes(), {
        year: 'numeric',
        era: 'short',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
    });
    let formatParts = dateTimeFormat.formatToParts(new Date()).map(p => p.type);

    /**
     * Returns the localized name of the era in the given format.
     *
     * @param year A representative year within the era.
     */
    function getEraName(year, format) {
        let longFormat = new Intl.DateTimeFormat(localizer.localeCodes(), {
            year: 'numeric',
            era: format,
            timeZone: 'UTC',
        });
        let eraDate = new Date(Date.UTC(0, 0, 1));
        eraDate.setUTCFullYear(year);
        let parts = longFormat.formatToParts(eraDate);
        let eraPart = parts.find(p => p.type === 'era');
        return eraPart && eraPart.value;
    }

    let bceName = getEraName(0, 'short');
    let ceName = getEraName(1, 'short');
    let eraNames = [
        {
            id: 'bce',
            value: bceName,
            title: bceName,
            display: selection => selection.append('span')
                .attr('class', 'localized-text')
                .text(bceName ? bceName : 'BCE'),
            terms: [getEraName(0, 'long'), getEraName(0, 'narrow')],
        },
        {
            id: 'ce',
            value: ceName,
            title: ceName,
            display: selection => selection.append('span')
                .attr('class', 'localized-text')
                .text(ceName ? ceName : 'CE'),
            terms: [getEraName(1, 'long'), getEraName(1, 'narrow')],
        },
    ];
    let eraCombo = uiCombobox(context, 'date-era')
        .data(eraNames);

    /// Returns the localized name of a month in the given format.
    function getMonthName(month, format) {
        let longFormat = new Intl.DateTimeFormat(localizer.localeCodes(), {
            month: format,
            timeZone: 'UTC',
        });
        let parts = longFormat.formatToParts(new Date(Date.UTC(0, month, 1)));
        let monthPart = parts.find(p => p.type === 'month');
        return monthPart && monthPart.value;
    }

    let monthNames = Array.from({length: 12}, (_, i) => getMonthName(i, 'long'))
        .filter(m => m);
    let alternativeMonthNames = Array.from({length: 12}, (_, i) => {
        return ['numeric', '2-digit', 'long', 'short', 'narrow']
            .map(format => getMonthName(i, format))
            .filter(m => m);
    });

    let monthCombo = uiCombobox(context, 'date-month')
        .data(monthNames.map((monthName, i) => {
            return {
                id: i + 1,
                value: monthName,
                title: monthName,
                display: selection => selection.append('span')
                    .attr('class', 'localized-text')
                    .text(monthName),
                terms: alternativeMonthNames[i],
            };
        }));

    let buttonTip = uiTooltip()
        .title(() => t.append('inspector.date.edtf'))
        .placement('left');


    // update _edtfValue
    function calcEDTFValue(tags) {
        if (_edtfValue && !tags[edtfKey]) {
            // Don't unset the variable based on deleted tags, since this makes the UI
            // disappear unexpectedly when clearing values - #8164
            _edtfValue = '';
        } else {
            _edtfValue = tags[edtfKey];
        }
    }


    function date(selection) {
        _selection = selection;

        let wrap = selection.selectAll('.form-field-input-wrap')
            .data([0]);

        wrap = wrap.enter()
            .append('div')
            .attr('class', 'form-field-input-wrap form-field-input-' + field.type)
            .merge(wrap);

        yearInput = wrap.selectAll('input.date-year')
            .data([0]);
        eraInput = wrap.selectAll('input.date-era')
            .data([0]);
        monthInput = wrap.selectAll('input.date-month')
            .data([0]);
        dayInput = wrap.selectAll('input.date-day')
            .data([0]);

        formatParts.forEach(part => {
            switch (part) {
                case 'year':
                    yearInput = yearInput.enter()
                        .append('input')
                        .attr('type', 'number')
                        .attr('class', 'date-main date-year')
                        .attr('id', field.domId)
                        .call(utilNoAuto)
                        .merge(yearInput);
                    break;
                case 'era':
                    eraInput = eraInput.enter()
                        .append('input')
                        .attr('type', 'text')
                        .attr('class', 'date-main date-era')
                        .call(eraCombo)
                        .merge(eraInput);
                    break;
                case 'month':
                    monthInput = monthInput.enter()
                        .append('input')
                        .attr('type', 'text')
                        .attr('class', 'date-main date-month')
                        .call(monthCombo)
                        .merge(monthInput);
                    break;
                case 'day':
                    dayInput = dayInput.enter()
                        .append('input')
                        .attr('type', 'number')
                        .attr('class', 'date-main date-day')
                        .call(utilNoAuto)
                        .merge(dayInput);
                    break;
            }
        });

        yearInput
            .on('change', change)
            .on('blur', change);
        eraInput
            .on('change', change)
            .on('blur', change);
        monthInput
            .on('change', change)
            .on('blur', change);
        dayInput
            .on('change', change)
            .on('blur', change);

        if (_tags && _edtfValue === undefined) {
            calcEDTFValue(_tags);
        }

        let edtfButton = wrap.selectAll('.date-add')
            .data([0]);

        edtfButton = edtfButton.enter()
            .append('button')
            .attr('class', 'date-add form-field-button')
            .attr('aria-label', t('icons.plus'))
            .call(svgIcon('#iD-icon-plus'))
            .merge(edtfButton);

        edtfButton
            .classed('disabled', typeof _edtfValue === 'string' || Array.isArray(_edtfValue))
            .call(buttonTip)
            .on('click', addEDTF);

        edtfInput = selection.selectAll('.date-edtf')
            .data([0]);

        edtfInput = edtfInput.enter()
            .append('div')
            .attr('class', 'date-edtf')
            .merge(edtfInput);

        edtfInput
            .call(renderEDTF);
    }


    function addEDTF(d3_event) {
        d3_event.preventDefault();

        if (typeof _edtfValue !== 'string' && !Array.isArray(_edtfValue)) {
            _edtfValue = '';

            edtfInput.call(renderEDTF);
        }
    }


    function change() {
        var tag = {};
        var yearValue = utilGetSetValue(yearInput).trim();
        var eraValue = utilGetSetValue(eraInput).trim();
        var monthValue = utilGetSetValue(monthInput).trim();
        var dayValue = utilGetSetValue(dayInput).trim();

        // don't override multiple values with blank string
        if (!yearValue && Array.isArray(_tags[field.key])) return;

        if (!yearValue) {
            tag[field.key] = undefined;
        } else {
            let value = '';
            let year = parseInt(context.cleanTagValue(yearValue), 10);
            if (!isNaN(year)) {
                if (eraValue === bceName) {
                    value += '-' + String(year - 1).padStart(4, '0');
                } else {
                    value += String(year).padStart(4, '0');
                }
                let month = context.cleanTagValue(monthValue);
                if (monthNames.includes(month)) {
                    month = monthNames.indexOf(month) + 1;
                    value += '-' + String(month).padStart(2, '0');
                    let day = parseInt(context.cleanTagValue(dayValue), 10);
                    if (!isNaN(day)) {
                        value += '-' + String(day).padStart(2, '0');
                    }
                }
            } else {
                value = context.cleanTagValue(yearValue);
            }
            tag[field.key] = value;
        }

        dispatch.call('change', this, tag);
    }


    function changeEDTFValue(d3_event, d) {
        let value = context.cleanTagValue(utilGetSetValue(d3_select(this))) || undefined;

        // don't override multiple values with blank string
        if (!value && Array.isArray(d.value)) return;

        let t = {};
        t[edtfKey] = value;
        if (d.value !== undefined) d.value = value;
        dispatch.call('change', this, t);
    }


    function renderEDTF(selection) {
        let entries = selection.selectAll('div.entry')
            .data((typeof _edtfValue === 'string' || Array.isArray(_edtfValue)) ? [_edtfValue] : []);

        entries.exit()
            .style('top', '0')
            .style('max-height', '240px')
            .transition()
            .duration(200)
            .style('opacity', '0')
            .style('max-height', '0px')
            .remove();

        let entriesEnter = entries.enter()
            .append('div')
            .attr('class', 'entry')
            .each(function() {
                var wrap = d3_select(this);

                let domId = utilUniqueDomId('edtf');
                let label = wrap
                    .append('label')
                    .attr('class', 'field-label')
                    .attr('for', domId);

                let text = label
                    .append('span')
                    .attr('class', 'label-text');

                text
                    .append('span')
                    .attr('class', 'label-textvalue')
                    .call(t.append('inspector.date.edtf_label'));

                text
                    .append('span')
                    .attr('class', 'label-textannotation');

                label
                    .append('button')
                    .attr('class', 'remove-icon-edtf')
                    .attr('title', t('icons.remove'))
                    .on('click', function(d3_event) {
                        d3_event.preventDefault();

                        // remove the UI item manually
                        _edtfValue = undefined;

                        if (edtfKey && edtfKey in _tags) {
                            delete _tags[edtfKey];
                            // remove from entity tags
                            let t = {};
                            t[edtfKey] = undefined;
                            dispatch.call('change', this, t);
                            return;
                        }

                        renderEDTF(selection);
                    })
                    .call(svgIcon('#iD-operation-delete'));

                wrap
                    .append('input')
                    .attr('type', 'text')
                    .attr('class', 'date-value')
                    .on('blur', changeEDTFValue)
                    .on('change', changeEDTFValue);
            });

        entriesEnter
            .style('margin-top', '0px')
            .style('max-height', '0px')
            .style('opacity', '0')
            .transition()
            .duration(200)
            .style('margin-top', '10px')
            .style('max-height', '240px')
            .style('opacity', '1')
            .on('end', function() {
                d3_select(this)
                    .style('max-height', '')
                    .style('overflow', 'visible');
            });

        entries = entries.merge(entriesEnter);

        entries.order();

        // allow removing the entry UIs even if there isn't a tag to remove
        entries.classed('present', true);

        utilGetSetValue(entries.select('.date-value'), function(d) {
                return typeof d === 'string' ? d : '';
            })
            .attr('title', function(d) {
                return Array.isArray(d) ? d.filter(Boolean).join('\n') : null;
            })
            .attr('placeholder', function(d) {
                return Array.isArray(d) ? t('inspector.multiple_values') : t('inspector.date.edtf_placeholder');
            })
            .classed('mixed', function(d) {
                return Array.isArray(d);
            });
    }


    date.tags = function(tags) {
        _tags = tags;

        var yearValue = tags[field.key];
        var eraValue;
        var monthValue;
        var dayValue;
        var isMixed = Array.isArray(yearValue);

        if (!isMixed && yearValue) {
            let parts = yearValue.match(/^(-?\d+)(?:-(\d\d))?(?:-(\d\d))?$/);
            if (parts && parts[1]) {
                yearValue = parseInt(parts[1], 10);
                if (yearValue < 1) {
                    yearValue = -yearValue + 1;
                    eraValue = bceName;
                } else {
                    eraValue = ceName;
                }

                if (parts[2]) {
                    monthValue = monthNames[parseInt(parts[2], 10) - 1] || parts[2];
                }

                if (parts[3]) {
                    dayValue = parseInt(parts[3], 10);
                }
            }
        }

        utilGetSetValue(yearInput, (typeof yearValue === 'number' || typeof yearValue === 'string') ? yearValue : '')
            .attr('title', isMixed ? yearValue.filter(Boolean).join('\n') : null)
            .attr('placeholder', isMixed ? t('inspector.multiple_values') : t('inspector.date.year'))
            .classed('mixed', isMixed);
        utilGetSetValue(eraInput, typeof eraValue === 'string' ? eraValue : '')
            .attr('placeholder', t('inspector.date.era'));
        utilGetSetValue(monthInput, typeof monthValue === 'string' ? monthValue : '')
            .attr('placeholder', t('inspector.date.month'));
        utilGetSetValue(dayInput, typeof dayValue === 'number' ? dayValue : '')
            .attr('placeholder', t('inspector.date.day'));

        calcEDTFValue(tags);

        _selection.call(date);
    };


    date.focus = function() {
        let node = yearInput.selectAll('input').node();
        if (node) node.focus();
    };


    date.entityIDs = function(val) {
        if (!arguments.length) return _entityIDs;
        _entityIDs = val;
        _edtfValue = undefined;
        return date;
    };


    return utilRebind(date, dispatch, 'on');
}
