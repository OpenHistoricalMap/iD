describe('iD.date', function() {
    describe('utilDatesOverlap', function() {
        it('compares years', function() {
            expect(iD.utilDatesOverlap({start_date: '1970', end_date: '2000'},
                                       {start_date: '1970', end_date: '2000'})).to.eql(true);
            expect(iD.utilDatesOverlap({start_date: '2000', end_date: '2038'},
                                       {start_date: '1970', end_date: '2000'})).to.eql(false);
            expect(iD.utilDatesOverlap({start_date: '1970', end_date: '2000'},
                                       {start_date: '2000-01', end_date: '2038'})).to.eql(false);
        });
        it('compares full dates', function() {
            expect(iD.utilDatesOverlap({start_date: '1970-01-01', end_date: '2000-01-01'},
                                       {start_date: '1970-01-01', end_date: '2000-01-01'})).to.eql(true);
            expect(iD.utilDatesOverlap({start_date: '1970-01-01', end_date: '2000-01-01'},
                                       {start_date: '2000-01-01', end_date: '2038-01-01'})).to.eql(false);
            expect(iD.utilDatesOverlap({start_date: '2000-01-01', end_date: '2038-01-01'},
                                       {start_date: '1970-01-01', end_date: '2000-01-01'})).to.eql(false);
        });
        it('treats touches as overlaps', function() {
            expect(iD.utilDatesOverlap({start_date: '1970', end_date: '2000'},
                                       {start_date: '2001', end_date: '2038'})).to.eql(false);
            expect(iD.utilDatesOverlap({start_date: '1970', end_date: '2000'},
                                       {start_date: '2001', end_date: '2038'}, true)).to.eql(false);
            expect(iD.utilDatesOverlap({start_date: '1970', end_date: '2000'},
                                       {start_date: '2000', end_date: '2038'})).to.eql(false);
            expect(iD.utilDatesOverlap({start_date: '1970', end_date: '2000'},
                                       {start_date: '2000', end_date: '2038'}, true)).to.eql(true);
            expect(iD.utilDatesOverlap({start_date: '1970', end_date: '2000-01'},
                                       {start_date: '2000', end_date: '2038'})).to.eql(false);
            expect(iD.utilDatesOverlap({start_date: '1970', end_date: '2000-01'},
                                       {start_date: '2000', end_date: '2038'}, true)).to.eql(true);
            expect(iD.utilDatesOverlap({start_date: '1970', end_date: '2000'},
                                       {start_date: '2000-01', end_date: '2038'}, true)).to.eql(true);
        });
    });

    describe('utilNormalizeDateString', function() {
        it('pads dates', function() {
            expect(iD.utilNormalizeDateString('1970-01-01').value).to.eql('1970-01-01');
            expect(iD.utilNormalizeDateString('1970-01-1').value).to.eql('1970-01-01');
            expect(iD.utilNormalizeDateString('1970-1-01').value).to.eql('1970-01-01');
            expect(iD.utilNormalizeDateString('-1-1-01').value).to.eql('-0001-01-01');
            expect(iD.utilNormalizeDateString('123').value).to.eql('0123');
            expect(iD.utilNormalizeDateString('-4003').value).to.eql('-4003'); // beyond displayable year range but still valid
            expect(iD.utilNormalizeDateString('31337').value).to.eql('31337');
            expect(iD.utilNormalizeDateString('-31337').value).to.eql('-31337');
        });
        it('wraps dates', function() {
            expect(iD.utilNormalizeDateString('1970-01-00').value).to.eql('1969-12-31');
            expect(iD.utilNormalizeDateString('1970-12-32').value).to.eql('1971-01-01');
            expect(iD.utilNormalizeDateString('1970-02-29').value).to.eql('1970-03-01');
            expect(iD.utilNormalizeDateString('1970-00').value).to.eql('1969-12');
            expect(iD.utilNormalizeDateString('1970-23').value).to.eql('1971-11'); // no EDTF for now
        });
        it('rejects malformed dates', function() {
            expect(iD.utilNormalizeDateString('1970-01--1')).to.eql(null);
            expect(iD.utilNormalizeDateString('197X')).to.eql(null); // no EDTF for now
            // https://github.com/OpenHistoricalMap/issues/issues/826
            expect(iD.utilNormalizeDateString('1912091095')).to.eql(null);
        });
        it('respects the original precision', function() {
            expect(iD.utilNormalizeDateString('123').value).to.eql('0123');
            expect(iD.utilNormalizeDateString('2000-06').value).to.eql('2000-06');
            expect(iD.utilNormalizeDateString('2000-06').localeOptions.month).to.eql('long');
            expect(iD.utilNormalizeDateString('2000-06').localeOptions.day).to.eql(undefined);
        });
        it('displays era before common era', function() {
            expect(iD.utilNormalizeDateString('1').localeOptions.era).to.eql(undefined);
            expect(iD.utilNormalizeDateString('0').localeOptions.era).to.eql('short');
            expect(iD.utilNormalizeDateString('-1').localeOptions.era).to.eql('short');
        });
    });

    describe('utilEDTFFromOSMDateString', function () {
        it('converts approximations', function () {
            expect(iD.utilEDTFFromOSMDateString('~1855')).to.eql('1855~');
            expect(iD.utilEDTFFromOSMDateString('1860s')).to.eql('186X');
            expect(iD.utilEDTFFromOSMDateString('1800s')).to.eql('180X');
            expect(iD.utilEDTFFromOSMDateString('~1940s')).to.eql('194X~');
            expect(iD.utilEDTFFromOSMDateString('C18')).to.eql('17XX');
            expect(iD.utilEDTFFromOSMDateString('C4')).to.eql('03XX');
            expect(iD.utilEDTFFromOSMDateString('~C13')).to.eql('12XX~');
        });
        it('converts early, late, and mid dates', function () {
            expect(iD.utilEDTFFromOSMDateString('late 1920s')).to.eql('1927~/1929~');
            expect(iD.utilEDTFFromOSMDateString('mid C14')).to.eql('1330~/1370~');
        });
        it('converts unbounded dates', function () {
            expect(iD.utilEDTFFromOSMDateString('before 1823')).to.eql('[..1823]');
            expect(iD.utilEDTFFromOSMDateString('before 1910-01-20')).to.eql('[..1910-01-20]');
            expect(iD.utilEDTFFromOSMDateString('after 1500')).to.eql('[1500..]');
        });
        it('converts date ranges', function () {
            expect(iD.utilEDTFFromOSMDateString('1914..1918')).to.eql('[1914..1918]');
            expect(iD.utilEDTFFromOSMDateString('2008-08-08..2008-08-24')).to.eql('[2008-08-08..2008-08-24]');
            expect(iD.utilEDTFFromOSMDateString('mid C17..late C17')).to.eql('1630~/1699~');
        });
    });
});
