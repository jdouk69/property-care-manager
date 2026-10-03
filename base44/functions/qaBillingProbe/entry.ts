// TEMPORARY QA verification probe — deleted after the anniversary-billing tests.
import { anniversaryDate, servicePeriod, periodIndexContaining, isLeapYear, daysInMonth, addDays } from '../../shared/servicePeriods.js';
import { serviceAnchor, coveredThrough, buildAnniversaryCharges } from '../../shared/recurringCharges.js';

export default async function(req) {
  try {
    const r = {};
    r.oct4 = [servicePeriod('2026-10-04', 0), servicePeriod('2026-10-04', 1)];
    r.jan31_common = { k1: anniversaryDate('2026-01-31', 1), k2: anniversaryDate('2026-01-31', 2), p0: servicePeriod('2026-01-31', 0), p1: servicePeriod('2026-01-31', 1) };
    r.jan31_leap = { k1: anniversaryDate('2028-01-31', 1), febDays: daysInMonth(2028, 2), leap: isLeapYear(2028), notLeap: isLeapYear(2027) };
    r.jan29 = { common_k1: anniversaryDate('2026-01-29', 1), leap_k1: anniversaryDate('2028-01-29', 1) };
    r.jan30 = { common_k1: anniversaryDate('2026-01-30', 1), leap_k1: anniversaryDate('2028-01-30', 1) };

    const contig = (anchor) => {
      const ps = [];
      for (let k = 0; k < 14; k++) ps.push(servicePeriod(anchor, k));
      for (let i = 1; i < ps.length; i++) {
        if (ps[i].start !== addDays(ps[i - 1].end, 1)) return `GAP/OVERLAP at k=${i}: ${ps[i - 1].end} -> ${ps[i].start}`;
      }
      return 'contiguous';
    };
    r.contiguity = {
      '2026-01-29': contig('2026-01-29'),
      '2026-01-30': contig('2026-01-30'),
      '2026-01-31': contig('2026-01-31'),
      '2026-10-04': contig('2026-10-04'),
    };

    r.index = {
      beforeAnchor: periodIndexContaining('2026-10-04', '2026-10-03'),
      onAnchor: periodIndexContaining('2026-10-04', '2026-10-04'),
      midPeriod: periodIndexContaining('2026-10-04', '2026-10-20'),
      onLastDay: periodIndexContaining('2026-10-04', '2026-11-03'),
      nextStart: periodIndexContaining('2026-10-04', '2026-11-04'),
      clampEdge: periodIndexContaining('2026-01-31', '2027-02-28'),
    };

    r.anchor = {
      startDateWins: serviceAnchor({ start_date: '2026-09-01', activated_at: '2026-08-31T01:54:11.496Z' }),
      activatedFallback: serviceAnchor({ activated_at: '2026-08-31T22:00:00.000Z' }),
      activatedMidnight: serviceAnchor({ activated_at: '2026-08-31T21:30:00.000Z' }),
      none: serviceAnchor({}),
    };

    r.coverage = {
      legacyMonth: coveredThrough('prop1', [
        { property_id: 'prop1', charge_type: 'Service', billing_period: '2026-10' },
        { property_id: 'prop1', charge_type: 'Service', billing_period: '2026-09' },
      ]),
      anniversary: coveredThrough('prop1', [{ property_id: 'prop1', charge_type: 'Service', period_end: '2026-11-03' }]),
      visitExcluded: coveredThrough('prop1', [
        { property_id: 'prop1', charge_type: 'Service', billing_period: '2026-09' },
        { property_id: 'prop1', charge_type: 'Visit', period_end: '2026-12-31' },
      ]),
      none: coveredThrough('prop1', []),
    };

    const mk = (over) => ({ id: 'a1', property_id: 'prop1', client_id: 'c1', service_package_id: 'p1', status: 'Active', signing_status: 'Signed', billing_type: 'Monthly', agreed_price: 95, ...over });
    const legacySepOct = [
      { property_id: 'prop1', charge_type: 'Service', billing_period: '2026-09', status: 'Paid' },
      { property_id: 'prop1', charge_type: 'Service', billing_period: '2026-10', status: 'Due' },
    ];
    const pkgs = { p1: { id: 'p1', name: 'Property Care' } };

    r.migration_real = buildAnniversaryCharges({ agreements: [mk({ start_date: '2026-09-01' })], packages: pkgs, existingCharges: legacySepOct, todayStr: '2026-10-03' }).charges.map((d) => ({ start: d.period.start, end: d.period.end, key: d.charge.source_key }));
    r.migration_real_atNov1 = buildAnniversaryCharges({ agreements: [mk({ start_date: '2026-09-01' })], packages: pkgs, existingCharges: legacySepOct, todayStr: '2026-11-01' }).charges.map((d) => ({ start: d.period.start, end: d.period.end }));

    const firstRun = buildAnniversaryCharges({ agreements: [mk({ start_date: '2026-10-04' })], packages: pkgs, existingCharges: [], todayStr: '2026-10-04' }).charges;
    const afterFirst = firstRun.map((d) => d.charge);
    r.retry = {
      first: firstRun.length,
      second: buildAnniversaryCharges({ agreements: [mk({ start_date: '2026-10-04' })], packages: pkgs, existingCharges: afterFirst, todayStr: '2026-10-04' }).charges.length,
    };

    r.catchup = buildAnniversaryCharges({ agreements: [mk({ start_date: '2026-01-04' })], packages: pkgs, existingCharges: [], todayStr: '2026-10-03' }).charges.map((d) => ({ start: d.period.start, end: d.period.end }));

    r.skips = {
      unsigned: buildAnniversaryCharges({ agreements: [mk({ status: 'Pending', start_date: '2026-10-04' })], packages: pkgs, existingCharges: [], todayStr: '2026-10-04' }).charges.length,
      inactive: buildAnniversaryCharges({ agreements: [mk({ status: 'Paused', start_date: '2026-10-04' })], packages: pkgs, existingCharges: [], todayStr: '2026-10-04' }).charges.length,
      unsignedSigned: buildAnniversaryCharges({ agreements: [mk({ signing_status: 'Draft', start_date: '2026-10-04' })], packages: pkgs, existingCharges: [], todayStr: '2026-10-04' }).charges.length,
      noPrice: buildAnniversaryCharges({ agreements: [mk({ agreed_price: null, start_date: '2026-10-04' })], packages: pkgs, existingCharges: [], todayStr: '2026-10-04' }).charges.length,
    };

    r.flag = buildAnniversaryCharges({ agreements: [mk({ start_date: null, activated_at: null })], packages: pkgs, existingCharges: [], todayStr: '2026-10-03' }).flags;
    r.future = buildAnniversaryCharges({ agreements: [mk({ start_date: '2026-12-01' })], packages: pkgs, existingCharges: [], todayStr: '2026-10-03' }).charges.length;
    r.twoVisits = buildAnniversaryCharges({ agreements: [mk({ start_date: '2026-10-04', agreed_price: 120 })], packages: pkgs, existingCharges: [], todayStr: '2026-10-04' }).charges.length;

    return r;
  } catch (e) {
    return { probeError: e && (e.stack || e.message) ? String(e.stack || e.message) : String(e) };
  }
}