import { actionChangeTags } from '../actions/change_tags';
import { localizer, t } from '../core/localizer';
import { utilDisplayLabel, utilNormalizeDateString, utilEDTFFromOSMDateString } from '../util';
import { validationIssue, validationIssueFix } from '../core/validation';

import * as edtf from 'edtf';

export function validationFormatting() {
    var type = 'invalid_format';

    var validation = function(entity) {
        var issues = [];

        function showReferenceDate(selection) {
            selection.selectAll('.issue-reference')
                .data([0])
                .enter()
                .append('div')
                .attr('class', 'issue-reference')
                .call(t.append('issues.invalid_format.date.reference'));
        }

        function validateDate(key, msgKey) {
            if (!entity.tags[key]) return;
            var normalized = utilNormalizeDateString(entity.tags[key]);
            if (normalized !== null && entity.tags[key] === normalized.value) return;
            issues.push(new validationIssue({
                type: type,
                subtype: 'date',
                severity: 'error',
                message: function(context) {
                    var entity = context.hasEntity(this.entityIds[0]);
                    return entity ? t.append('issues.invalid_format.date.message_' + msgKey,
                        { feature: utilDisplayLabel(entity, context.graph()) }) : '';
                },
                reference: showReferenceDate,
                entityIds: [entity.id],
                hash: key + entity.tags[key],
                dynamicFixes: function() {
                    var fixes = [];

                    let alternatives = [];
                    if (normalized !== null) {
                        let label = normalized.date.toLocaleDateString(localizer.localeCodes(), normalized.localeOptions);
                        alternatives.push({
                            date: normalized.value,
                            label: label || normalized.value,
                        });
                    }
                    let edtfFromOSM = utilEDTFFromOSMDateString(entity.tags[key]);
                    if (edtfFromOSM) {
                        let label;
                        try {
                            label = edtf.default(edtfFromOSM).format(localizer.localeCode());
                        } catch (e) {
                            label = edtfFromOSM;
                        }
                        alternatives.push({
                            edtf: edtfFromOSM,
                            label: label,
                        });
                    }

                    fixes.push(...alternatives.map(alt => new validationIssueFix({
                        title: t.append('issues.fix.reformat_date.title', { date: alt.label }),
                        onClick: function(context) {
                            context.perform(function(graph) {
                                var entityInGraph = graph.hasEntity(entity.id);
                                if (!entityInGraph) return graph;
                                var newTags = Object.assign({}, entityInGraph.tags);
                                if (alt.date) {
                                    newTags[key] = alt.date;
                                } else {
                                    delete newTags[key];
                                }
                                newTags[key + ':edtf'] = alt.edtf;
                                return actionChangeTags(entityInGraph.id, newTags)(graph);
                            }, t('issues.fix.reformat_date.annotation'));
                        }
                    })));

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
            }));
        }
        validateDate('start_date', 'start');
        validateDate('end_date', 'end');

        function showReferenceEDTF(selection, parserError) {
            let message;
            if (typeof parserError.offset === 'number' && parserError.token) {
                message = t.append('issues.invalid_format.edtf.reference', {
                    token: parserError.token.value,
                    position: (parserError.offset + 1).toLocaleString(localizer.localeCodes()),
                });
            } else if (parserError.message) {
                message = selection => selection.append('span')
                    .attr('class', 'localized-text')
                    .attr('lang', 'en')
                    .text(parserError.message.replace(/^edtf: /, ''));
            }
            if (!message) {
                return;
            }

            selection.selectAll('.issue-reference')
                .data([0])
                .enter()
                .append('div')
                .attr('class', 'issue-reference')
                .call(message);
        }

        function validateEDTF(key, msgKey) {
            key += ':edtf';
            if (!entity.tags[key]) return;
            let parserError;
            try {
                edtf.parse(entity.tags[key]);
                return;
            } catch (e) {
                parserError = e;
            }
            issues.push(new validationIssue({
                type: type,
                subtype: 'date',
                severity: 'warning',
                message: function(context) {
                    var entity = context.hasEntity(this.entityIds[0]);
                    return entity ? t.append('issues.invalid_format.edtf.message_' + msgKey,
                        { feature: utilDisplayLabel(entity, context.graph()) }) : '';
                },
                reference: selection => showReferenceEDTF(selection, parserError),
                entityIds: [entity.id],
                hash: key + entity.tags[key],
                dynamicFixes: function() {
                    var fixes = [];
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
            }));
        }
        validateEDTF('start_date', 'start');
        validateEDTF('end_date', 'end');

        function isValidEmail(email) {
            // Emails in OSM are going to be official so they should be pretty simple
            // Using negated lists to better support all possible unicode characters (#6494)
            var valid_email = /^[^\(\)\\,":;<>@\[\]]+@[^\(\)\\,":;<>@\[\]\.]+(?:\.[a-z0-9-]+)*$/i;

            // An empty value is also acceptable
            return (!email || valid_email.test(email));
        }

        function showReferenceEmail(selection) {
            selection.selectAll('.issue-reference')
                .data([0])
                .enter()
                .append('div')
                .attr('class', 'issue-reference')
                .call(t.append('issues.invalid_format.email.reference'));
        }

        /* see https://github.com/openstreetmap/iD/issues/6831#issuecomment-537121379
        function isSchemePresent(url) {
            var valid_scheme = /^https?:\/\//i;
            return (!url || valid_scheme.test(url));
        }
        function showReferenceWebsite(selection) {
            selection.selectAll('.issue-reference')
                .data([0])
                .enter()
                .append('div')
                .attr('class', 'issue-reference')
                .call(t.append('issues.invalid_format.website.reference'));
        }

        if (entity.tags.website) {
            // Multiple websites are possible
            // If ever we support ES6, arrow functions make this nicer
            var websites = entity.tags.website
                .split(';')
                .map(function(s) { return s.trim(); })
                .filter(function(x) { return !isSchemePresent(x); });

            if (websites.length) {
                issues.push(new validationIssue({
                    type: type,
                    subtype: 'website',
                    severity: 'warning',
                    message: function(context) {
                        var entity = context.hasEntity(this.entityIds[0]);
                        return entity ? t.append('issues.invalid_format.website.message' + this.data,
                            { feature: utilDisplayLabel(entity, context.graph()), site: websites.join(', ') }) : '';
                    },
                    reference: showReferenceWebsite,
                    entityIds: [entity.id],
                    hash: websites.join(),
                    data: (websites.length > 1) ? '_multi' : ''
                }));
            }
        }*/

        if (entity.tags.email) {
            // Multiple emails are possible
            var emails = entity.tags.email
                .split(';')
                .map(function(s) { return s.trim(); })
                .filter(function(x) { return !isValidEmail(x); });

            if (emails.length) {
                issues.push(new validationIssue({
                    type: type,
                    subtype: 'email',
                    severity: 'warning',
                    message: function(context) {
                        var entity = context.hasEntity(this.entityIds[0]);
                        return entity ? t.append('issues.invalid_format.email.message' + this.data,
                            { feature: utilDisplayLabel(entity, context.graph()), email: emails.join(', ') }) : '';
                    },
                    reference: showReferenceEmail,
                    entityIds: [entity.id],
                    hash: emails.join(),
                    data: (emails.length > 1) ? '_multi' : ''
                }));
            }
        }

        return issues;
    };

    validation.type = type;

    return validation;
}
