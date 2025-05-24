const { Solar } = require('lunar-javascript');

/**
 * 將生日轉換成八字四柱（如無時間則用午時排三柱）
 */
function getBaziFromDate({ year, month, day, hour = null, minute = 0 }) {
  const useHour = typeof hour === 'number';
  const safeHour = useHour ? hour : 12;
  const solar = Solar.fromYmdHms(year, month, day, safeHour, minute, 0);
  const lunar = solar.getLunar();
  const eightChar = lunar.getEightChar();

  return {
    hasHour: useHour,
    date: `${year}-${month}-${day}`,
    year: eightChar.getYear(),
    month: eightChar.getMonth(),
    day: eightChar.getDay(),
    hour: useHour ? eightChar.getTime() : null
  };
}

module.exports = { getBaziFromDate };