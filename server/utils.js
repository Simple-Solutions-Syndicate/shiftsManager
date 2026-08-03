'use strict';

const dayjs = require('dayjs');

function userSelection (users, shift, day, date, existingShift){
    users.sort((a, b) => a.score - b.score);
    function convertDate(isoDate) {
        const parts = isoDate.split('-');
        const [year, month, day] = parts;
        return `${day}/${month}/${year}`;
      }

    const choosen = [];
    for (const user of users) {
        if (!user.absences.includes(convertDate(date)) && !existingShift.includes(user.id) && choosen.length < shift) {
            choosen.push(user);
        }
    }
    
    choosen.forEach(user => {
        user.score += shift; 
    });
    
    return choosen;
}

exports.createMonthlyShifts = (users, month, year, rules) => {
    const weeklyShifts = {};
    
    if (rules && Array.isArray(rules)) {
        rules.forEach(rule => {
            weeklyShifts[rule.day_of_week] = rule.num_people;
        });
    }

    const monthlyShifts = [];
    const monthDays = dayjs(`${year}-${month}`).daysInMonth();

    for (let day = 1; day <= monthDays; day++) {
        const date = dayjs(`${year}-${month}-${day}`).format('YYYY-MM-DD');
        const weekDayNumber = dayjs(date).day();
        
        let shiftCount = weeklyShifts[weekDayNumber];
        
        if (shiftCount === undefined) {
            const alternativeKey = weekDayNumber === 0 ? 7 : weekDayNumber;
            shiftCount = weeklyShifts[alternativeKey];
        }
        
        if (shiftCount && shiftCount > 0) {
            const existingShifts = monthlyShifts.filter(shift => shift.date === date).map(shift => shift.shift).flat();
            const dailyShifts = userSelection(users, shiftCount, weekDayNumber, date, existingShifts);

            monthlyShifts.push({ date, shift: dailyShifts.map(p => p.name) });
        }
    }
    return monthlyShifts;
};