import {
    select as d3_select
} from 'd3-selection';

import { t } from '../core/localizer';
import { svgIcon } from '../svg/icon';
import { utilGetSetValue, utilUniqueDomId } from '../util';

export function uiSourceSubfield(context, field, tags, dispatch) {

    var sourceSubfield = {};

    let sourceInput = d3_select(null);
    let sourceKey = field.key + ':source';
    let _sourceValue = tags[sourceKey];

    // Adapted from renderEDTF from modules/ui/fields/date.js
    function renderSourceInput(selection) {
        let entries = selection.selectAll('div.entry')
            .data((typeof _sourceValue === 'string' || Array.isArray(_sourceValue)) ? [_sourceValue] : []);

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

                let domId = utilUniqueDomId('source-' + field.safeid);
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
                    .call(t.append('inspector.field_source_label', { field_name: field.title }));

                text
                    .append('span')
                    .attr('class', 'label-textannotation');

                label
                    .append('button')
                    .attr('class', 'remove-icon-source')
                    .attr('title', t('icons.remove'))
                    .on('click', function(d3_event) {
                        d3_event.preventDefault();

                        // remove the UI item manually
                        _sourceValue = undefined;

                        let t = {};
                        t[sourceKey] = undefined;
                        dispatch.call('change', this, t);

                        renderSourceInput(selection);
                    })
                    .call(svgIcon('#iD-operation-delete'));

                wrap
                    .append('input')
                    .attr('type', 'text')
                    .attr('class', 'field-source-value')
                    .on('blur', changeSourceValue)
                    .on('change', changeSourceValue);
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

        utilGetSetValue(entries.select('.field-source-value'), function(d) {
                return typeof d === 'string' ? d : '';
            })
            .attr('title', function(d) {
                return Array.isArray(d) ? d.filter(Boolean).join('\n') : null;
            })
            .attr('placeholder', function(d) {
                return Array.isArray(d) ? t('inspector.multiple_values') : t('inspector.field_source_placeholder');
            })
            .classed('mixed', function(d) {
                return Array.isArray(d);
            });
    }

    function changeSourceValue(d3_event, d) {
        let value = context.cleanTagValue(utilGetSetValue(d3_select(this))) || undefined;
        // don't override multiple values with blank string
        if (!value && Array.isArray(d.value)) return;

        let t = {};
        t[sourceKey] = value;
        if (d.value !== undefined) d.value = value;
        dispatch.call('change', this, t);
    }

    function addSource(d3_event) {
        d3_event.preventDefault();

        if (typeof _sourceValue !== 'string' && !Array.isArray(_sourceValue)) {
            _sourceValue = '';
        }
        sourceInput.call(renderSourceInput);

    }

    sourceSubfield.button = function(labelEnter, container) {
        labelEnter
        .append('button')
        .attr('class', 'source-icon')
        .attr('title', function() {
            return t('inspector.field_source');
        })
        .call(svgIcon('#fas-at', 'inline'));

        container = container
        .merge(labelEnter);

        container.select('.field-label > .source-icon')  // propagate bound data
        .on('click', addSource);
    };


    sourceSubfield.body = function(selection) {
        sourceInput = selection.selectChild().selectAll('.field-source')
        .data([0]);

        sourceInput = sourceInput.enter()
        .append('div')
        .attr('class', 'field-source')
        .merge(sourceInput);

        sourceInput
        .call(renderSourceInput);
    };

    return sourceSubfield;
}
