describe('iD.uiFieldDate', function() {
    let context, selection, field;

    beforeEach(function() {
        context = iD.coreContext().assetPath('../dist/').init();
        selection = d3.select(document.createElement('div'));
        field = iD.presetField('name', { key: 'start_date', type: 'date' });
    });

    it('adds an EDTF field when the + button is clicked', () => new Promise(done => {
        var date = iD.uiFieldDate(field, context);
        window.setTimeout(function() {   // async, so data will be available
            selection.call(date);
            happen.click(selection.selectAll('.date-add').node());
            expect(selection.selectAll('.date-value').nodes().length).to.equal(1);
            done();
        }, 20);
    }));

    it('creates an EDTF tag after setting the value', () => new Promise(done => {
        var date = iD.uiFieldDate(field, context);
        window.setTimeout(function() {   // async, so data will be available
            selection.call(date);
            happen.click(selection.selectAll('.date-add').node());

            iD.utilGetSetValue(selection.selectAll('.date-value'), '1066-10-14T09:00');
            happen.once(selection.selectAll('.date-value').node(), {type: 'change'});

            date.on('change', function(tags) {
                expect(tags).to.eql({'start_date:edtf': '1066-10-14T09:00'});
            });

            done();
        }, 20);
    }));

    it('ignores similar keys like `end_date`',  () => new Promise(done => {
        var date = iD.uiFieldDate(field, context);
        window.setTimeout(function() {   // async, so data will be available
            selection.call(date);
            date.tags({'end_date:edtf': '1066-10-14T09:00'});

            expect(selection.selectAll('.date-value').empty()).to.be.ok;
            done();
        }, 20);
    }));

    it('removes the tag when the value is emptied',  () => new Promise(done => {
        var date = iD.uiFieldDate(field, context);
        window.setTimeout(function() {   // async, so data will be available
            selection.call(date);
            date.tags({'start_date:edtf': '1066-10-14T09:00'});

            date.on('change', function(tags) {
                expect(tags).to.eql({'start_date:edtf': undefined});
            });

            iD.utilGetSetValue(selection.selectAll('.date-value'), '');
            happen.once(selection.selectAll('.date-value').node(), {type: 'change'});
            done();
        }, 20);
    }));
});
