import edtf, { Interval } from 'edtf';

// Returns whether two date component arrays represent the same date.
// A date component array contains the full date, followed by year, month, day.
// Dates are only compared to the lowest common precision.
function isSameDate(date1, date2) {
    if (date1[1] !== date2[1]) return false;
    if (date1[2] && date2[2] && date1[2] !== date2[2]) return false;
    if (date1[3] && date2[3] && date1[3] !== date2[3]) return false;
    return true;
}

function isBefore(date1, date2) {
    if (date1[1] > date2[1]) return false;
    if (date1[2] && date2[2] && date1[2] > date2[2]) return false;
    if (date1[3] && date2[3] && date1[3] > date2[3]) return false;
    return true;
}

function isAfter(date1, date2) {
    if (date1[1] < date2[1]) return false;
    if (date1[2] && date2[2] && date1[2] < date2[2]) return false;
    if (date1[3] && date2[3] && date1[3] < date2[3]) return false;
    return true;
}

/**
 * Returns whether the two sets of tags overlap temporally.
 *
 * @param {object} tags1 Tags to compare.
 * @param {object} tags2 Tags to compare.
 * @param {boolean?} touchIsOverlap True to consider it an overlap if one date range ends at the same time that the other begins.
 */
export function utilDatesOverlap(tags1, tags2, touchIsOverlap) {
    // If the feature has a valid start date but no valid end date, assume it
    // starts at the beginning of time.
    var dateRegex = /^(-?\d{1,4})(?:-(\d\d))?(?:-(\d\d))?$/;
    var minDate = ['-9999', '-9999'],
        maxDate = ['9999', '9999'],
        start1 = (tags1.start_date || '').match(dateRegex) || minDate,
        start2 = (tags2.start_date || '').match(dateRegex) || minDate,
        end1 = (tags1.end_date || '').match(dateRegex) || maxDate,
        end2 = (tags2.end_date || '').match(dateRegex) || maxDate;

    if (isSameDate(end1, start2) || isSameDate(end2, start1)) {
        return touchIsOverlap === true;
    }

    return ((isAfter(start1, start2) && isBefore(start1, end2)) ||
            (isAfter(start2, start1) && isBefore(start2, end1)) ||
            (isAfter(end1, start2) && isBefore(end1, end2)) ||
            (isAfter(end2, start1) && isBefore(end2, end1)));
}

// Returns an object containing the given date string normalized as an ISO 8601 date string and parsed as a Date object.
// Date components are padded for compatibility with tagging conventions.
// Dates such as January 0, February 31, and Duodecember 1 are wrapped to make more sense.
export function utilNormalizeDateString(raw) {
    if (!raw) return null;

    var date;

    // Enforce the same date formats supported by DateFunctions-plpgsql and decimaldate-python.
    var dateRegex = /^(-)?(\d+)(?:-(\d\d?)(?:-(\d\d?))?)?$/;
    var match = raw.match(dateRegex);
    if (match !== null) {
        // Manually construct a Date.
        // Passing the string directly into the Date constructor would throw an error on negative years.
        date = new Date(0);
        date.setUTCFullYear(parseInt((match[1] || '') + match[2], 10));
        if (match[3]) date.setUTCMonth(parseInt(match[3], 10) - 1); // 0-based
        if (match[4]) date.setUTCDate(parseInt(match[4], 10));
        if (isNaN(date.getDate())) {
            return null;
        }
    } else {
        // Fall back on whatever the browser can parse into a date.
        date = new Date(raw);
        try {
            date.toISOString();
        } catch (exc) {
            return null;
        }
    }

    // Reconstruct the date string.
    // Avoid Date.toISOString() because it has fixed precision and excessively pads negative years.
    var normalized = '';
    if (match !== null && date.getUTCFullYear() < 0) {
        var absYear = Math.abs(date.getUTCFullYear());
        normalized += '-' + String(absYear).padStart(4, '0');
    } else {
        normalized += String(date.getUTCFullYear()).padStart(4, '0');
    }
    if (match === null || match[3]) {
        normalized += '-' + String(date.getUTCMonth() + 1).padStart(2, '0');
    }
    if (match === null || match[4]) {
        normalized += '-' + String(date.getUTCDate()).padStart(2, '0');
    }
    return {
        date: date,
        value: normalized,
        localeOptions: {
            year: 'numeric',
            era: date.getUTCFullYear() < 1 ? 'short' : undefined,
            month: (match === null || match[3]) ? 'long' : undefined,
            day: (match === null || match[4]) ? 'numeric' : undefined,
            timeZone: 'UTC'
        }
    };
}

/**
 * Converts a date in OSM approximate date format to EDTF.
 */
export function utilEDTFFromOSMDateString(osm) {
    // https://wiki.openstreetmap.org/wiki/Key:start_date#Approximations
    // https://wiki.openstreetmap.org/wiki/Special:Diff/510218/557626#Proposal_for_date_formatting
    // https://www.loc.gov/standards/datetime/
    let [match, start, end, bc] = osm.match(/^(.+)\.\.(.+)( BCE?)?$/) || [];
    if (match) {
        if (!bc) bc = '';
        let startEDTF = utilEDTFFromOSMDateString(start + bc);
        if (startEDTF) {
            let parsed = edtf(startEDTF);
            if (parsed instanceof Set) {
                startEDTF = parsed.earlier ? '' : parsed.first.edtf;
            }
            if (parsed instanceof Interval) {
                startEDTF = parsed.earlier ? '' : parsed.lower.edtf;
            }
        }

        let endEDTF = utilEDTFFromOSMDateString(end + bc);
        if (endEDTF) {
            let parsed = edtf(endEDTF);
            if (parsed instanceof Set) {
                endEDTF = parsed.later ? '' : parsed.last.edtf;
            }
            if (parsed instanceof Interval) {
                endEDTF = parsed.later ? '' : parsed.upper.edtf;
            }
        }

        if (startEDTF && endEDTF) {
            if (startEDTF.match(/[~?%]/) || endEDTF.match(/[~?%]/)) {
                // Set notation is incompatible with qualifiers.
                return `${startEDTF}/${endEDTF}`;
            } else {
                return `[${startEDTF}..${endEDTF}]`;
            }
        }
    }

    let year, circa, monthDay;
    [match, circa, year, monthDay, bc] = osm.match(/^(~)?(\d+)(-\d\d(?:-\d\d)?)?( BCE?)?$/) || [];
    if (match) {
        if (!circa) circa = '';
        if (!monthDay) monthDay = '';
        if (bc) {
            year = '-' + String(parseInt(year, 10) - 1).padStart(4, '0');
        } else {
            year = year.padStart(4, '0');
        }
        return `${year}${monthDay}${circa}`;
    }

    let decade;
    [match, circa, decade, bc] = osm.match(/^(~)?(\d+)0s( BCE?)?$/) || [];
    if (match) {
        if (!circa) circa = '';
        if (!bc) {
            return `${decade.padStart(3, '0')}X${circa}`;
        }
        let startYear = String(parseInt(decade, 10) * 10 + 8).padStart(4, '0');
        let endYear = String(parseInt(decade, 10) * 10 - 1).padStart(4, '0');
        return `-${startYear}${circa}/-${endYear}${circa}`;
    }

    let century;
    [match, circa, century, bc] = osm.match(/^(~)?C(\d+)( BCE?)?$/) || [];
    if (match) {
        if (!circa) circa = '';
        if (!bc) {
            return `${String(parseInt(century, 10) - 1).padStart(2, '0')}XX${circa}`;
        }
        let startYear = String((parseInt(century, 10) - 1) * 100 + 98).padStart(4, '0');
        let endYear = String((parseInt(century, 10) - 1) * 100 - 1).padStart(4, '0');
        return `-${startYear}${circa}/-${endYear}${circa}`;
    }

    let third;
    [match, third, decade, bc] = osm.match(/^(early|mid|late) (\d+)0s( BCE?)?$/) || [];
    if (match) {
        // https://uhlibraries-digital.github.io/bcdams-map/guidelines/date
        const offsetsByThird = {
            early: [0, 3],
            mid: [3, 7],
            late: [7, 9],
        };

        let startYear = decade * 10 + offsetsByThird[third][bc ? 1 : 0];
        let endYear = decade * 10 + offsetsByThird[third][bc ? 0 : 1];
        if (bc) {
            startYear = startYear + 1;
            endYear = endYear + 1;
            return `-${String(startYear).padStart(4, '0')}~/-${String(endYear).padStart(4, '0')}~`;
        } else {
            return `${String(startYear).padStart(4, '0')}~/${String(endYear).padStart(4, '0')}~`;
        }
    }

    [match, third, century, bc] = osm.match(/^(early|mid|late) C(\d+)( BCE?)?$/) || [];
    if (match) {
        // https://uhlibraries-digital.github.io/bcdams-map/guidelines/date
        const offsetsByThird = {
            early: [0, 30],
            mid: [30, 70],
            late: [70, 99],
        };

        century = parseInt(century, 10) - 1;
        let startYear = century * 100 + offsetsByThird[third][bc ? 1 : 0];
        let endYear = century * 100 + offsetsByThird[third][bc ? 0 : 1];
        if (bc) {
            startYear = startYear + 1;
            endYear = endYear + 1;
            return `-${String(startYear).padStart(4, '0')}~/-${String(endYear).padStart(4, '0')}~`;
        } else {
            return `${String(startYear).padStart(4, '0')}~/${String(endYear).padStart(4, '0')}~`;
        }
    }

    [match, end] = osm.match(/^before (\d{4}(?:-\d\d)?(?:-\d\d)?)$/) || [];
    if (match) {
        return `[..${end}]`;
    }

    [match, start] = osm.match(/^after (\d{4}(?:-\d\d)?(?:-\d\d)?)$/) || [];
    if (match) {
        return `[${start}..]`;
    }
}
