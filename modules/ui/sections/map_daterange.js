import { dispatch as d3_dispatch } from 'd3-dispatch';
import { select as d3_select } from 'd3-selection';

import { t } from '../../core/localizer';
import { uiTooltip } from '../tooltip';
import { uiSection } from '../section';
import { utilQsString, utilStringQs } from '../../util';

const MIN_YEAR = -4000;
const MAX_YEAR = (new Date()).getFullYear();

const PLUSMINUS_STYLES = [
    { name: 'font-weight', value: 'bold' },
    { name: 'font-size', value: '200%' },
    { name: 'padding', value: '0 5px' },
];
const INPUT_STYLES = [
    { name: 'width', value: '100px' },
    { name: 'text-align', value: 'center' },
];
const LABEL_STYLES = [
    { name: 'font-weight', value: 'bold' },
    { name: 'display', value: 'inline-block' },
    { name: 'width', value: '75px' },
];

export function uiSectionDateRange(context) {
    // despite appearing as a separate panel, Map Features does the real filtering
    // see applyDateRange() in this panel, where the dateRange value is set
    // see modules/renderer/features.js checkDateFilter() which applies the filters
    // see modules/renderer/features.js update() which updates URL params

    const section = uiSection('date_ranges', context)
        .title(t('date_ranges.title'))
        .disclosureContent(renderDisclosureContent)
        .expandedByDefault(false);

    function renderDisclosureContent(selection) {
        const container = selection.selectAll('.date_ranges-container').data([0]);

        // min year: - button, year input, + button
        const mindate_label = container.enter()
            .append('label')
            .html(t('date_ranges.start_date.description'))
            .merge(container);
        const mindate_minus = container.enter()
            .append('button')
            .html('-')
            .call(uiTooltip()
                .title(t('date_ranges.start_date.tooltip')).placement('bottom')
            )
            .merge(container);
        const mindate_input = container.enter()
            .append('input')
            .attr('type', 'number')
            .attr('min', MIN_YEAR)
            .attr('max', MAX_YEAR)
            .attr('step', 1)
            .attr('value', MIN_YEAR)
            .attr('title', t('date_ranges.start_date.tooltip'))
            .attr('placeholder', t('date_ranges.start_date.placeholder'))
            .merge(container);
        const mindate_plus = container.enter()
            .append('button')
            .html('+')
            .call(uiTooltip()
                .title(t('date_ranges.start_date.tooltip')).placement('bottom')
            )
            .merge(container);

        // line break
        container.enter()
            .append('br')
            .merge(container);

        // max year: - button, year input, + button
        const maxdate_label = container.enter()
            .append('label')
            .html(t('date_ranges.end_date.description'))
            .merge(container);
        const maxdate_minus = container.enter()
            .append('button')
            .html('-')
            .call(uiTooltip()
                .title(t('date_ranges.end_date.tooltip')).placement('bottom')
            )
            .merge(container);
        const maxdate_input = container.enter()  // we will refer to this widget by its name attribute to fetch our date range
            .append('input')
            .attr('type', 'number')
            .attr('min', MIN_YEAR)
            .attr('max', MAX_YEAR)
            .attr('step', 1)
            .attr('value', MAX_YEAR)
            .attr('title', t('date_ranges.end_date.tooltip'))
            .attr('placeholder', t('date_ranges.end_date.placeholder'))
            .merge(container);
        const maxdate_plus = container.enter()
            .append('button')
            .html('+')
            .call(uiTooltip()
                .title(t('date_ranges.end_date.tooltip')).placement('bottom')
            )
            .merge(container);

        // apply styles
        PLUSMINUS_STYLES.forEach(function (style) {
            mindate_plus.style(style.name, style.value);
            mindate_minus.style(style.name, style.value);
            maxdate_minus.style(style.name, style.value);
            maxdate_plus.style(style.name, style.value);
        });
        INPUT_STYLES.forEach(function (style) {
            mindate_input.style(style.name, style.value);
            maxdate_input.style(style.name, style.value);
        });
        LABEL_STYLES.forEach(function (style) {
            mindate_label.style(style.name, style.value);
            maxdate_label.style(style.name, style.value);
        });

        // event handlers for the +/- buttons to change year
        mindate_minus.on('click', function () {
            const year = parseInt(mindate_input.property('value')) - 1;
            const min = parseInt(mindate_input.property('min'));
            if (year >= min) mindate_input.property('value', year).dispatch('change');
        });
        mindate_plus.on('click', function () {
            const year = parseInt(mindate_input.property('value')) + 1;
            const max = parseInt(mindate_input.property('max'));
            if (year <= max) mindate_input.property('value', year).dispatch('change');
        });
        maxdate_minus.on('click', function () {
            const year = parseInt(maxdate_input.property('value')) - 1;
            const min = parseInt(maxdate_input.property('min'));
            if (year >= min) maxdate_input.property('value', year).dispatch('change');
        });
        maxdate_plus.on('click', function () {
            const year = parseInt(maxdate_input.property('value')) + 1;
            const max = parseInt(maxdate_input.property('max'));
            if (year <= max) maxdate_input.property('value', year).dispatch('change');
        });

        // event handler for change event
        // intercept invalid & blank and correct them to our hardcoded in/max
        // then cause a re-filter/redraw
        function applyDateRange() {
            const minyear = parseInt(mindate_input.property('value'));
            const maxyear = parseInt(maxdate_input.property('value'));

            context.features().dateRange = [minyear, maxyear];
            context.flush();

            updateUrlParam();
        }

        function ensureValidInputs() {
            const minyear = parseInt(mindate_input.property('value'));
            const maxyear = parseInt(maxdate_input.property('value'));

            if (! minyear || isNaN(minyear) || minyear < MIN_YEAR || minyear > MAX_YEAR) {
                mindate_input.property('value', MIN_YEAR);
            }
            if (! maxyear || isNaN(maxyear) || maxyear < MIN_YEAR || maxyear > MAX_YEAR) {
                maxdate_input.property('value', MAX_YEAR);
            }

            if (minyear > maxyear) {
                maxdate_input.property('value', minyear);
            }
        }

        function updateUrlParam() {
            if (!window.mocha) {
                const hash = utilStringQs(window.location.hash);

                const daterange = context.features().dateRange;
                if (daterange) {
                    hash.daterange = daterange.join(',');
                } else {
                    delete hash.daterange;
                }

                window.location.replace('#' + utilQsString(hash, true));
            }
        }

        mindate_input.on('change', function () {
            ensureValidInputs();
            applyDateRange();
        });
        maxdate_input.on('change', function () {
            ensureValidInputs();
            applyDateRange();
        });

        // startup
        // load the start/end date from URL params
        // then apply it so we have context().dateRange defined as early as possible
        let startingdaterange = utilStringQs(window.location.hash).daterange;
        if (startingdaterange) {
            startingdaterange = startingdaterange.split(',').map(d => parseInt(d));
            const isvalid = (!isNaN(startingdaterange[0]) && startingdaterange[0] >= MIN_YEAR) &&
                            (!isNaN(startingdaterange[1]) && startingdaterange[1] <= MAX_YEAR);
            if (isvalid) {
                mindate_input.property('value', startingdaterange[0]);
                maxdate_input.property('value', startingdaterange[1]);
            }
        }
        applyDateRange();
    }

    return section;
}
