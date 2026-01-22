import { localizer, t } from '../core/localizer';
import { utilDisplayLabel } from '../util/utilDisplayLabel';
import { utilNormalizeDateString, utilEDTFFromOSMDateString } from '../util';
import { validationIssue, validationIssueFix } from '../core/validation';
import { actionChangeTags } from '../actions/change_tags';

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
                        } catch {
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

        function isValidURL(url, strict = false) {
            try {
                // First try strict WHATWG parsing
                const link = new URL(url);
                return link.href.includes(url);
            } catch {
                if (strict) return false;
                // Fallback: accept if it looks like a valid scheme://something, even if semicolons are present
                return /^https?:\/\/\S+$/i.test(url);
            }
        }

        function cleanWikimediaCommonsReference(value) {
            if (!value) return null;
            for (const prefix of ['file', 'datei', 'fichier', 'plik']) {
                if (!value.toLowerCase().startsWith(prefix + ':')) continue;
                return 'File' + decodeURIComponent(value.slice(prefix.length));
            }
            if (value.startsWith('Category:')) return decodeURIComponent(value);
            return null;
        }

        function showReferenceWebsite(selection) {
            selection.selectAll('.issue-reference')
                .data([0])
                .enter()
                .append('div')
                .attr('class', 'issue-reference')
                .call(t.append('issues.invalid_format.website.reference'));
        }

        const websiteValidationIssueBase = {
            type: type,
            subtype: 'website',
            severity: 'warning',
            message: function(context) {
                var entity = context.hasEntity(this.entityIds[0]);
                return entity ? t.append('issues.invalid_format.website.message' + (this.data?.count > 1 ? '_multi' : ''),
                    { feature: utilDisplayLabel(entity, context.graph()), site: this.data?.value }) : '';
            },
            dynamicFixes: function(context) {
                const wikimedia_commons_reference = cleanWikimediaCommonsReference(this.data?.value);
                const fixes = [{ protocol: 'https', icon: 'temaki-lock' }, { protocol: 'http' }]
                    .filter(fix => isValidURL(fix.protocol + '://' + this.data?.value, true))
                    .map(fix => new validationIssueFix({
                        icon: fix.icon,
                        title: t.append('issues.fix.add_protocol_'+ fix.protocol +'.title'),
                        onClick: function() {
                            const entityID = this.issue.entityIds[0];
                            const entity = context.entity(entityID);
                            if (!entity) return;
                            const key = this.issue.data.key;
                            const tags = Object.assign({}, entity.tags);
                            tags[key] = entity.tags[key]
                                .split(';')
                                .map(s => s.trim())
                                .map(s => isValidURL(s) ? s : fix.protocol + '://' + s)
                                .join(';');

                            context.perform(
                                actionChangeTags(entityID, tags),
                                t('issues.fix.add_protocol_'+ fix.protocol +'.annotation')
                            );
                        }
                    }));
                if (this.data?.key === 'image' && !entity.tags.wikimedia_commons && wikimedia_commons_reference) {
                    fixes.push(new validationIssueFix({
                        icon: 'iD-icon-out-link',
                        title: t.append('issues.fix.move_value_to_wikimedia_commons.title'),
                        onClick: function() {
                            const entityID = this.issue.entityIds[0];
                            const entity = context.entity(entityID);
                            if (!entity) return;
                            const key = this.issue.data.key;
                            const tags = Object.assign({}, entity.tags);
                            tags.wikimedia_commons = wikimedia_commons_reference;
                            delete tags[key];

                            context.perform(
                                actionChangeTags(entityID, tags),
                                t('issues.fix.move_value_to_wikimedia_commons.annotation')
                            );
                        }
                    }));
                }
                return fixes;
            },
            reference: showReferenceWebsite,
            entityIds: [entity.id]
        };

        Object.entries(entity.tags).map(function([key, tag]) {
            if (!/\b(website|url)\b|^image$/i.test(key)) return null;
            if (!tag) return null;
            const value = tag.trim();
            if (!value) return null;
            if (!value.includes(';')) {
                // No semicolon, validate whole value
                if (isValidURL(value)) return null;
                return {
                    ...websiteValidationIssueBase,
                    data: { key, value },
                    hash: key + '=' + value
                };
            }
            const invalidParts = value.split(';').map(s => s.trim()).filter(x => !isValidURL(x));
            if (!invalidParts.length) {
                if (isValidURL(value)) return null;
                // All split parts valid, but whole value still invalid
                return {
                    ...websiteValidationIssueBase,
                    data: { key, value },
                    hash: key + '=' + value
                };
            }
            return {
                ...websiteValidationIssueBase,
                data: { key, value: invalidParts.join(', '), count: invalidParts.length },
                hash: key + '=' + invalidParts.join()
            };
        }).filter(issue => issue !== null).forEach(issueData => issues.push(new validationIssue(issueData)));

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
