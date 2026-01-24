import { actionChangeTags } from '../actions/change_tags';
import { localizer, t } from '../core/localizer';
import { utilDisplayLabel } from '../util/utilDisplayLabel';
import { utilNormalizeDateString } from '../util/ohm_date';
import { validationIssue, validationIssueFix } from '../core/validation';

import * as edtf from 'edtf';

export function validationMismatchedDates() {
    let type = 'mismatched_dates';

    function parseEDTF(value) {
        try {
            let parsed = edtf.default(value);

            // According to edtf.js, an extended interval with an unknown start or end covers no date.
            // This isn't useful for the purpose of testing whether the basic date matches, so treat it as an unspecified start or end.
            if (parsed.lower === null) {
                parsed.lower = Infinity;
            }
            if (parsed.upper === null) {
                parsed.upper = Infinity;
            }

            return parsed;
        } catch {
            // Already handled by invalid_format rule.
            return;
        }
    }

    function getReplacementDates(parsed) {
        let likelyDates = new Set();

        let valueFromDate = (date, precision) => {
            date.precision = precision;
            return date.edtf.split('T')[0];
        };

        if (Number.isFinite(parsed.min)) {
            let min = edtf.default(parsed.min);
            let precision = (parsed.lower || parsed.first || parsed).precision;
            likelyDates.add(valueFromDate(min, precision));
        }

        if (Number.isFinite(parsed.max)) {
            let max = edtf.default(parsed.max);
            let precision = (parsed.upper || parsed.last || parsed).precision;
            likelyDates.add(valueFromDate(max, precision));
        }

        let sortedDates = [...likelyDates];
        sortedDates.sort();
        return sortedDates;
    }

    let validation = function(entity) {
        let issues = [];

        function showReferenceEDTF(selection) {
            selection.selectAll('.issue-reference')
                .data([0])
                .enter()
                .append('div')
                .attr('class', 'issue-reference')
                .call(t.append('issues.mismatched_dates.edtf.reference'));
        }

        function getDynamicFixes(key, parsed) {
            let fixes = [];

            let replacementDates = getReplacementDates(parsed);
            fixes.push(...replacementDates.map(value => {
                let normalized = utilNormalizeDateString(value);
                let localeDateString = normalized.date.toLocaleDateString(localizer.languageCode(), normalized.localeOptions);
                return new validationIssueFix({
                    title: t.append('issues.fix.reformat_date.title', { date: localeDateString }),
                    onClick: function(context) {
                        context.perform(function(graph) {
                            var entityInGraph = graph.hasEntity(entity.id);
                            if (!entityInGraph) return graph;
                            var newTags = Object.assign({}, entityInGraph.tags);
                            newTags[key] = normalized.value;
                            return actionChangeTags(entityInGraph.id, newTags)(graph);
                        }, t('issues.fix.reformat_date.annotation'));
                    }
                });
            }));

            fixes.push(new validationIssueFix({
                icon: 'iD-operation-delete',
                title: t.append('issues.fix.remove_tag.title'),
                onClick: function(context) {
                    context.perform(function(graph) {
                        var entityInGraph = graph.hasEntity(entity.id);
                        if (!entityInGraph) return graph;
                        var newTags = Object.assign({}, entityInGraph.tags);
                        delete newTags[key];
                        return actionChangeTags(entityInGraph.id, newTags)(graph);
                    }, t('issues.fix.remove_tag.annotation'));
                }
            }));

            return fixes;
        }

        function validateEDTF(key, msgKey) {
            if (!entity.tags[key] || !entity.tags[key + ':edtf']) return;
            let basic = entity.tags[key];
            let basicAsEDTF = parseEDTF(basic);
            let parsed = parseEDTF(entity.tags[key + ':edtf']);
            if (!basicAsEDTF || !parsed || parsed.covers(basicAsEDTF) || basicAsEDTF.covers(parsed)) return;

            // start_date and end_date disallow time precision. Transform the basic date into a daylong range in EDTF to allow a comparison to an EDTF date with time precision.
            // https://github.com/OpenHistoricalMap/issues/issues/764
            if (basic.match('^-?[0-9]+-[0-9]{2}-[0-9]{2}$')) {
                let basicTime = parseEDTF(`${basic}T00:00:00/${basic}T24:00:00`);
                if (basicTime && (parsed.covers(basicTime) || basicTime.covers(parsed))) return;
            }

            issues.push(new validationIssue({
                type: type,
                subtype: 'date',
                severity: 'warning',
                message: function(context) {
                    let entity = context.hasEntity(this.entityIds[0]);
                    return entity ? t.append('issues.mismatched_dates.edtf.message_' + msgKey,
                        { feature: utilDisplayLabel(entity, context.graph()) }) : '';
                },
                reference: showReferenceEDTF,
                entityIds: [entity.id],
                hash: key + entity.tags[key + ':edtf'],
                dynamicFixes: () => getDynamicFixes(key, parsed),
            }));
        }
        validateEDTF('start_date', 'start');
        validateEDTF('end_date', 'end');

        return issues;
    };

    validation.type = type;
    validation.parseEDTF = parseEDTF;
    validation.getReplacementDates = getReplacementDates;

    return validation;
}
