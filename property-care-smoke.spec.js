// property-care-smoke.spec.js
// Run with Playwright
// npx playwright test property-care-smoke.spec.js

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'YOUR_BASE44_APP_URL_HERE';

const errors = [];

test.beforeEach(async ({ page }) => {
  errors.length = 0;

  page.on('pageerror', err => {
    errors.push(`PAGE ERROR: ${err.message}`);
  });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`CONSOLE ERROR: ${msg.text()}`);
    }
  });

  page.on('requestfailed', request => {
    errors.push(
      `REQUEST FAILED: ${request.method()} ${request.url()} - ${
        request.failure()?.errorText || 'unknown'
      }`
    );
  });
});

test.afterEach(async () => {
  if (errors.length) {
    console.log('\nErrors detected:');
    console.log(errors.join('\n'));
  }
});

test('Property Care full smoke test', async ({ page }) => {
  test.setTimeout(120000);

  // ---------------------------------------------------------
  // 1. LOAD APP
  // ---------------------------------------------------------
  await page.goto(BASE_URL, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });

  await expect(page.getByText('Property Care').first()).toBeVisible();

  console.log('✓ App loaded');

  // ---------------------------------------------------------
  // 2. DASHBOARD
  // ---------------------------------------------------------
  await expect(
    page.getByText(/Good morning|Good afternoon|Good evening/i)
  ).toBeVisible();

  await expect(page.getByText('Start Visit')).toBeVisible();

  console.log('✓ Dashboard loaded');

  // ---------------------------------------------------------
  // 3. BOTTOM NAVIGATION
  // ---------------------------------------------------------
  for (const navItem of ['Home', 'Tasks', 'Calendar', 'Search', 'More']) {
    await expect(
      page.getByText(navItem, { exact: true }).last()
    ).toBeVisible();
  }

  console.log('✓ Bottom navigation visible');

  // ---------------------------------------------------------
  // 4. TASKS
  // ---------------------------------------------------------
  await page.getByText('Tasks', { exact: true }).last().click();
  await page.waitForTimeout(800);

  await expect(page.locator('body')).toContainText(/Task/i);

  console.log('✓ Tasks opens');

  // ---------------------------------------------------------
  // 5. CALENDAR
  // ---------------------------------------------------------
  await page.getByText('Calendar', { exact: true }).last().click();
  await page.waitForTimeout(800);

  await expect(page.locator('body')).toContainText(/Calendar|Today|Month/i);

  console.log('✓ Calendar opens');

  // ---------------------------------------------------------
  // 6. SEARCH
  // ---------------------------------------------------------
  await page.getByText('Search', { exact: true }).last().click();
  await page.waitForTimeout(800);

  await expect(page.locator('body')).toContainText(/Search/i);

  console.log('✓ Search opens');

  // ---------------------------------------------------------
  // 7. MORE MENU
  // ---------------------------------------------------------
  await page.getByText('More', { exact: true }).last().click();
  await page.waitForTimeout(800);

  const bodyText = await page.locator('body').innerText();

  const expectedModules = [
    'Clients',
    'Properties',
    'Visits',
    'Inspections',
    'Issues',
    'Tasks',
    'Contractors',
    'Expenses',
    'Receipts',
  ];

  for (const moduleName of expectedModules) {
    if (bodyText.includes(moduleName)) {
      console.log(`✓ More menu contains ${moduleName}`);
    } else {
      console.warn(`⚠ More menu missing ${moduleName}`);
    }
  }

  // ---------------------------------------------------------
  // 8. RETURN HOME
  // ---------------------------------------------------------
  await page.getByText('Home', { exact: true }).last().click();
  await page.waitForTimeout(800);

  await expect(page.getByText('Start Visit')).toBeVisible();

  console.log('✓ Returned Home');

  // ---------------------------------------------------------
  // 9. START VISIT FLOW
  // ---------------------------------------------------------
  await page.getByText('Start Visit').click();

  await expect(
    page.getByText(/Start a Property Visit|Select the property/i)
  ).toBeVisible();

  console.log('✓ Start Visit opens');

  // ---------------------------------------------------------
  // 10. SELECT TEST PROPERTY
  // ---------------------------------------------------------
  const villaSunset = page.getByText('Villa Sunset', { exact: true });

  if (await villaSunset.count()) {
    await villaSunset.first().click();

    await expect(
      page.getByText(/Choose visit type/i)
    ).toBeVisible();

    console.log('✓ Property selection works');

    // -------------------------------------------------------
    // 11. MONTHLY PROPERTY WATCH
    // -------------------------------------------------------
    const monthlyWatch = page.getByText(
      'Monthly Property Watch',
      { exact: true }
    );

    if (await monthlyWatch.count()) {
      await monthlyWatch.first().click();

      await page.waitForTimeout(1000);

      await expect(page.locator('body')).toContainText(
        /Monthly Property Watch/i
      );

      console.log('✓ Monthly Property Watch starts');

      // -----------------------------------------------------
      // 12. CHECKLIST EXISTS
      // -----------------------------------------------------
      const checklistText = await page.locator('body').innerText();

      const expectedChecklistItems = [
        'Gates',
        'Fences',
        'Doors',
      ];

      for (const item of expectedChecklistItems) {
        if (checklistText.includes(item)) {
          console.log(`✓ Checklist contains ${item}`);
        } else {
          console.warn(`⚠ Checklist missing ${item}`);
        }
      }

      // -----------------------------------------------------
      // 13. WORKFLOW BAR
      // -----------------------------------------------------
      const workflowSteps = [
        'Inspection',
        'Issues',
        'Tasks',
        'Expenses',
      ];

      for (const step of workflowSteps) {
        if (checklistText.includes(step)) {
          console.log(`✓ Workflow contains ${step}`);
        } else {
          console.warn(`⚠ Workflow missing ${step}`);
        }
      }

      // -----------------------------------------------------
      // 14. COMPLETE VISIT PROTECTION
      // -----------------------------------------------------
      const completeVisit = page.getByText(
        'Complete Visit',
        { exact: true }
      );

      if (await completeVisit.count()) {
        await completeVisit.first().click();

        await page.waitForTimeout(500);

        const warning = page.getByText(/Visit incomplete/i);

        if (await warning.count()) {
          console.log('✓ Incomplete visit warning works');

          const continueInspection = page.getByText(
            /Continue Inspection/i
          );

          if (await continueInspection.count()) {
            await continueInspection.first().click();
          }
        } else {
          console.warn(
            '⚠ No incomplete-visit warning appeared'
          );
        }
      }
    } else {
      console.warn('⚠ Monthly Property Watch not found');
    }
  } else {
    console.warn('⚠ Villa Sunset not found');
  }

  // ---------------------------------------------------------
  // 15. FINAL ERROR CHECK
  // ---------------------------------------------------------
  if (errors.length) {
    console.log('\nSmoke test completed with runtime errors:');
    console.log(errors.join('\n'));
  } else {
    console.log('\n✓ No page/console/request errors detected');
  }

  console.log('\n===== SMOKE TEST COMPLETE =====');
});