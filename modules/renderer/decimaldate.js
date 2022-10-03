/*
 * decimaldate.js
 * https://github.com/OpenHistoricalMap/decimaldate-javascript
 */


exports.iso2dec = iso2dec = (isodate) => {
    const datepieces = isodate.match(RE_YEARMONTHDAY);
    if (! datepieces) throw (`Invalid date format ${isodate}`);

    [plusminus, yearstring, monthstring, daystring] = datepieces.slice(1);
    if (! isvalidmonth(monthstring) || ! isvalidmonthday(yearstring, monthstring, daystring))  throw `Invalid date ${isodate}`;

    let decbit = proportionofdayspassed(yearstring, monthstring, daystring);
    if (plusminus == '-') decbit = 1 - decbit;

    let yeardecimal = parseInt(yearstring) + decbit;
    if (plusminus == '-') yeardecimal *= -1;

    return parseFloat(yeardecimal.toFixed(DECIMALPLACES));
};


exports.dec2iso = dec2iso = (decdate) => {
    // strip the integer/year part
    // find how many days were in this year, multiply back out to get the day-of-year number
    if (decdate >= 0) {
        yearint = parseInt(Math.abs(Math.floor(decdate)));
        plusminus = '';
    }
    else {
        yearint = parseInt(Math.abs(Math.ceil(decdate)));
        plusminus = '-';
    }

    const yearstring = yearint + "";
    const dty = daysinyear(yearstring);
    let targetday = dty * (Math.abs(decdate) % 1);
    targetday = decdate >= 0 ? Math.ceil(targetday) : Math.floor(targetday);
    if (decdate < 0) targetday = dty - targetday;

    // count up days months at a time, until we reach our target month
    // the the remainder days is the day of the month, offset by 1 cuz we count from 0
    const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
    let monthstring;
    let dayspassed = 0;
    for (var i=0, l=months.length; i<l; i++) {
        monthstring = months[i];

        const dtm = daysinmonth(yearstring, monthstring);
        if (dayspassed + dtm < targetday) {
            dayspassed += dtm;
        }
        else {
            break;
        }
    }

    const daynumber = targetday - dayspassed;
    const daystring = (daynumber < 10 ? "0" : "") + daynumber;

    return `${plusminus}${yearstring}-${monthstring}-${daystring}`;
};


const DECIMALPLACES = 6;

const RE_YEARMONTHDAY = /^(\-?\+?)(\d+)\-(\d\d)\-(\d\d)$/;


const isvalidmonth = (monthstring) => {
    validmonths = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
    return validmonths.indexOf(monthstring) != -1;
};


const isvalidmonthday = (yearstring, monthstring, daystring) => {
    days = parseInt(daystring);
    if (isNaN(days)) return false;
    if (days < 0) return false;
    if (days > daysinmonth(yearstring, monthstring)) return false;
    return true;
};


const proportionofdayspassed = (yearstring, monthstring, daystring) => {
    // count the number of days to get to this day of this month
    let dayspassed = 0;
    ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']
    .forEach((tms) => {
        if (tms < monthstring) dayspassed += daysinmonth(yearstring, tms);
    });
    dayspassed += parseInt(daystring);

    // subtract 1 cuz day 0 is January 1 and not January 0
    // add 0.5 to get us 12 noon
    dayspassed -= 1;
    dayspassed += 0.5;

    // divide by days in year, to get decimal portion since noon of Jan 1
    const dty = daysinyear(yearstring);
    return dayspassed / dty;
};


const daysinmonth = (yearstring, monthstring) => {
    monthdaycounts = {
        '01': 31,
        '02': 28,  // February
        '03': 31,
        '04': 30,
        '05': 31,
        '06': 30,
        '07': 31,
        '08': 31,
        '09': 30,
        '10': 31,
        '11': 30,
        '12': 31,
    };

    if (isleapyear(yearstring)) monthdaycounts['02'] = 29;

    return monthdaycounts[monthstring];
};


const daysinyear = (yearstring) => {
    return isleapyear(yearstring) ? 366 : 365;
};


const isleapyear = (yearstring) => {
    yearnumber = parseInt(yearstring);
    const isleap = yearnumber % 4 == 0 && (yearnumber % 100 != 0 || yearnumber % 400 == 0);
    return isleap;
};

