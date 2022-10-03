import { dispatch as d3_dispatch } from 'd3-dispatch';
import { select as d3_select } from 'd3-selection';

import { t } from '../../core/localizer';
import { uiTooltip } from '../tooltip';
import { uiSection } from '../section';
import { utilQsString, utilStringQs } from '../../util';

const DEFAULT_MIN_DATE = '-4000-01-01';
const DEFAULT_MAX_DATE = (new Date()).getFullYear() + '-12-31';

const INPUT_STYLES = [
    { name: 'width', value: '125px' },
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
        .label(() => t.append('date_ranges.title'))
        .disclosureContent(renderDisclosureContent)
        .expandedByDefault(false);

    function renderDisclosureContent(selection) {
        const container = selection.selectAll('.date_ranges-container').data([0]);

        // start date label & input
        const mindate_label = container.enter()
            .append('label')
            .html(t('date_ranges.start_date.description'))
            .merge(container);
        const mindate_input = container.enter()
            .append('input')
            .attr('type', 'text')
            .attr('value', DEFAULT_MIN_DATE)
            .attr('title', () => t.append('date_ranges.start_date.tooltip'))
            .attr('placeholder', () => t.append('date_ranges.start_date.placeholder'))
            .merge(container);

        // line break
        container.enter()
            .append('br')
            .merge(container);

        // end date label & input
        const maxdate_label = container.enter()
            .append('label')
            .html(t('date_ranges.end_date.description'))
            .merge(container);
        const maxdate_input = container.enter()  // we will refer to this widget by its name attribute to fetch our date range
            .append('input')
            .attr('type', 'text')
            .attr('value', DEFAULT_MAX_DATE)
            .attr('title', () => t.append('date_ranges.end_date.tooltip'))
            .attr('placeholder', () => t.append('date_ranges.end_date.placeholder'))
            .merge(container);

        // apply styles
        INPUT_STYLES.forEach(function (style) {
            mindate_input.style(style.name, style.value);
            maxdate_input.style(style.name, style.value);
        });
        LABEL_STYLES.forEach(function (style) {
            mindate_label.style(style.name, style.value);
            maxdate_label.style(style.name, style.value);
        });

        // event handler for change event
        // intercept invalid & blank and correct them to our hardcoded in/max
        // then cause a re-filter/redraw
        function applyDateRange() {
            const mindate = mindate_input.property('value');
            const maxdate = maxdate_input.property('value');

            context.features().dateRange = [mindate, maxdate];
            context.flush();

            updateUrlParam();
        }

        function ensureValidInputs() {
            let mindate = mindate_input.property('value');
            let maxdate = maxdate_input.property('value');

            if (mindate.match(/^\-?\d\d\d\d\-\d\d\-\d\d$/)) {
                // perfect yyyy-mm-dd
            } else if (mindate.match(/^\-?\d\d\d\d\-\d\d$/)) {
                mindate += '-01'; // yyyy-mm, add -dd
                mindate_input.property('value', mindate);
            } else if (mindate.match(/^\-?\d\d\d\d$/)) {
                mindate += '-01-01'; // yyyy, add -mm-dd
                mindate_input.property('value', mindate);
            } else if (mindate.match(/^\-?\d{1,3}$/)) {
                mindate = mindate.padStart(4, '0') + '-01-01';
                mindate_input.property('value', mindate);
            } else {
                mindate = DEFAULT_MIN_DATE;
            }

            if (maxdate.match(/^\-?\d\d\d\d\-\d\d\-\d\d$/)) {
                // perfect yyyy-mm-dd
            } else if (maxdate.match(/^\-?\d\d\d\d\-\d\d$/)) {
                const ym = maxdate.match(/^\-?(\d\d\d\d)\-(\d\d)$/);
                const d = (new Date(parseInt(ym[1]), parseInt(ym[2]), 0)).getDate();
                maxdate += `-${String(d).padStart(2, '0')}`; // yyyy-mm, add -dd
                maxdate_input.property('value', maxdate);
            } else if (maxdate.match(/^\-?\d\d\d\d$/)) {
                maxdate += '-12-31'; // yyyy, add -mm-dd
                maxdate_input.property('value', maxdate);
            } else if (maxdate.match(/^\-?\d{1,3}$/)) {
                maxdate = maxdate.padStart(4, '0') + '-12-31';
                maxdate_input.property('value', maxdate);
            } else {
                maxdate = DEFAULT_MAX_DATE;
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
            startingdaterange = startingdaterange.split(',');
            const isvalid =startingdaterange[0].match(/^\-?\d\d\d\d\-\d\d\-\d\d$/) && startingdaterange[1].match(/^\-?\d\d\d\d\-\d\d\-\d\d$/);
            if (isvalid) {
                mindate_input.property('value', startingdaterange[0]);
                maxdate_input.property('value', startingdaterange[1]);
            }
        }
        applyDateRange();
    }

    return section;
}
