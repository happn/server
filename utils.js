

var utils = {
    getWeekDays : function (date) {        
        var weekdays = [],
            len = date.length,
            target = new Date(date.slice(len - 6, len - 4) + "." + date.slice(0, len - 6) + "." + date.slice(len - 4, len)),
            day = target.getDay(),
            month = target.getMonth() + 1,
            year = target.getFullYear(),
            date = target.getDate(),
            monday = 0;

        day = day == 0 ? 6 : day - 1;
        if (date - day > 0) {
            monday = date - day;

            for (var day = 0; day <= 6; day++) {
                if (monday > this.getMaxDays(month, year)) {
                    monday = 1;
                    month++;
                    if (month > 12) {
                        year++;
                        month = 1;
                    }
                }
                weekdays[day] = [this.twoDigits(monday++), this.twoDigits(month), year].join('');
            }
            return weekdays;
        } else {
            for (var c = day; c > 0; c--) {
                if ((date - 1) === 0) {
                    month--;
                    if (month === 0) year--;
                    date = this.getMaxDays(month, year);

                } else {
                    date--;
                }
            }
            return this.getWeekDays([this.twoDigits(date), this.twoDigits(month), year].join(''));
        }
    },

    twoDigits : function(d){
        return (d.toString()).length === 1 ? "0" + d : d.toString();
    },

    eightDigits: function(d){
        return (d.toString()).length === 7 ? "0" + d : d.toString();
    },

    getMaxDays :  function(month, year) {
            var isSchaltJahr = (year % 4 == 0) && (year % 100 != 0) || (year % 400 == 0),
                isFeb = (month == 2),
                isLongMonth = ((month <= 7) && (month % 2 != 0)) || ((month > 7) && (month % 2 == 0));

            return (isFeb && isSchaltJahr) ? 29 : isFeb ? 28 : isLongMonth ? 31 : 30;
    },

    validateDate : function(date){
        var out = date.replace(".", "");

        return this.eightDigits(out);
    },

    parseHTML : function(markup){
        var html = markup, b;

        //parsing bold
        var b = markup.match(/\_\_(.+)\_\_/);
        if(b){
            b[1] = '<b>' + b[1] + '</b>';
            html = html.replace(b[0], b[1]);  
        }
       

        //parsing line breaks
        html = html.replace(/\#/,'' ); //leading #
        html = html.replace(/\#/g, '<br />'); // # with <br />

        return html;
    },
    schwuchtify : function (date){
        //ensure string
        var out = this.eightDigits(date),
        parts = [];

        parts.push(out.substring(2,4));
        parts.push( out.substring(0,2));
        parts.push(out.substring(4,8));
        
        return parts.join("/");

    },
    nowString : function(){
        var n = new Date();
	console.log(this.twoDigits(n.getDate()) + this.twoDigits( n.getMonth() +1) +  n.getFullYear());
        return  this.twoDigits(n.getDate())+ this.twoDigits(n.getMonth()+1) + n.getFullYear();
    }

};

module.exports = utils;
