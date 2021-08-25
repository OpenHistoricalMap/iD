import { interpolateRgb as d3_interpolateRgb } from 'd3-interpolate';
import { event as d3_event } from 'd3-selection';

import { t } from '../../core/localizer';
import { modeSave } from '../../modes';
import { svgIcon } from '../../svg';
import { uiCmd } from '../cmd';
import { uiTooltip } from '../tooltip';


export function uiToolSave(context) {

    var tool = {
        id: 'save',
        label: t('save.title')
    };

    var button = null;
    var tooltipBehavior = null;
    var history = context.history();
    var key = uiCmd('⌘S');
    var _numChanges = 0;

    function isSaving() {
        var mode = context.mode();
        return mode && mode.id === 'save';
    }

    function isDisabled() {
        return _numChanges === 0 || isSaving();
    }

    function save() {
        d3_event.preventDefault();
        if (!context.inIntro() && !isSaving() && history.hasChanges()) {
            context.enter(modeSave(context));
        }
    }

    function bgColor() {
        var step;
        if (_numChanges === 0) {
            return null;
        } else if (_numChanges <= 50) {
            step = _numChanges / 50;
            return d3_interpolateRgb('#fff', '#ff8')(step);  // white -> yellow
        } else {
            step = Math.min((_numChanges - 50) / 50, 1.0);
            return d3_interpolateRgb('#ff8', '#f88')(step);  // yellow -> red
        }
    }

    function updateCount() {
        var val = history.difference().summary().length;
        if (val === _numChanges) return;

        _numChanges = val;

        if (tooltipBehavior) {
            tooltipBehavior
                .title(t(_numChanges > 0 ? 'save.help' : 'save.no_changes'))
                .keys([key]);
        }

        if (button) {
            button
                .classed('disabled', isDisabled())
                .style('background', bgColor(_numChanges));

            button.select('span.count')
                .text(_numChanges);
        }
    }

    function customFieldValidation() {
        // return a list of invalidities: field name other other such message
        var invalid_fields = [];

        var start_date = context.container().select('div.wrap-form-field.wrap-form-field-start_date input[type="text"]').node();
        var end_date = context.container().select('div.wrap-form-field.wrap-form-field-end_date input[type="text"]').node();
        start_date = start_date ? start_date.value : null;
        end_date = end_date ? end_date.value : null;
        var dates_regex1 = /^\-?\d\d\d\d\-\d\d\-\d\d$/;
        var dates_regex2 = /^\-?\d\d\d\d\-\d\d$/;
        var dates_regex3 = /^\-?\d\d\d\d$/;

        if (start_date && ! start_date.match(dates_regex1) && ! start_date.match(dates_regex2) && ! start_date.match(dates_regex3)) {
                invalid_fields.push("Start Date: YYYY-MM-DD, YYYY-MM, or YYYY");
        }
        if (end_date && ! end_date.match(dates_regex1) && ! end_date.match(dates_regex2) && ! end_date.match(dates_regex3)) {
                invalid_fields.push("End Date: YYYY-MM-DD, YYYY-MM, or YYYY");
        }

        return invalid_fields;
    }

    tool.render = function(selection) {
        tooltipBehavior = uiTooltip()
            .placement('bottom')
            .title(t('save.no_changes'))
            .keys([key])
            .scrollContainer(context.container().select('.top-toolbar'));

        var lastPointerUpType;

        button = selection
            .append('button')
            .attr('class', 'save disabled bar-button')
            .on('pointerup', function() {
                lastPointerUpType = d3_event.pointerType;
            })
            .on('click', function() {
                var invalids = customFieldValidation();
                if (invalids && invalids.length) {
                    var errmsg = t('save.error') + "\n" + invalids.join("\n");
                    return alert(errmsg);
                }

                d3_event.preventDefault();

                save();

                if (_numChanges === 0 && (
                    lastPointerUpType === 'touch' ||
                    lastPointerUpType === 'pen')
                ) {
                    // there are no tooltips for touch interactions so flash feedback instead
                    context.ui().flash
                        .duration(2000)
                        .iconName('#iD-icon-save')
                        .iconClass('disabled')
                        .text(t('save.no_changes'))();
                }
                lastPointerUpType = null;
            })
            .call(tooltipBehavior);

        button
            .call(svgIcon('#iD-icon-save'));

        button
            .append('span')
            .attr('class', 'count')
            .attr('aria-hidden', 'true')
            .text('0');

        updateCount();


        context.keybinding()
            .on(key, save, true);


        context.history()
            .on('change.save', updateCount);

        context
            .on('enter.save', function() {
                if (button) {
                    button
                        .classed('disabled', isDisabled());

                    if (isSaving()) {
                        button.call(tooltipBehavior.hide);
                    }
                }
            });
    };


    tool.uninstall = function() {
        context.keybinding()
            .off(key, true);

        context.history()
            .on('change.save', null);

        context
            .on('enter.save', null);

        button = null;
        tooltipBehavior = null;
    };

    return tool;
}
