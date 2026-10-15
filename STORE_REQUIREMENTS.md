---
title: App Store requirements
description: >-
  Review a listing of all of the requirements that need to be met to be eligible
  for the Shopify App Store.
source_url:
  html: >-
    https://shopify.dev/docs/apps/launch/shopify-app-store/app-store-requirements
  md: >-
    https://shopify.dev/docs/apps/launch/shopify-app-store/app-store-requirements.md
---

# App Store requirements

To qualify for the Shopify App Store, your app must meet the requirements listed below. Each requirement in this list helps your app meet our app quality standards. Some requirements are general and apply to all apps, and others apply to [specific categories of apps](#category-specific).

These requirements are subject to change, as we're continuously making improvements to the Shopify App Store and developer platform. The App Excellence Team conducts [quality checks](https://shopify.dev/docs/apps/launch/app-store-review/app-quality-checks) regularly. Your app is expected to meet any new requirements that are added here. The Shopify App Review team can reject an app at their discretion if it doesn't meet the set standards.

## 1. Policy

All Shopify App Store apps must comply with the [Partner Program Agreement](https://www.shopify.com/ca/partners/terms). Partners should act in good faith and in the best interests of merchants and buyers. Partners should not intentionally circumvent critical platform functionality.

#### 1.1 Build and operate within Shopify's platform

Shopify requires apps to be secure, truthful, and privacy-safe, operating within—not around—Shopify’s core systems. Apps that circumvent core workflows or provide unapproved services (such as unauthorized payments, marketplaces, agency brokering, content copying, refunds, or lending) aren’t allowed.

Show requirements

1.1.1**Use session tokens for authentication.**

Your embedded app must function properly without relying on third-party cookies or local storage, including when accessed in incognito mode on Chrome.

1.1.2**Use Shopify checkout.**

Shopify can't guarantee the safety or security of an order that's been placed through an offsite or third party checkout. Apps that bypass checkout or payment processing, or register any transactions through the Shopify API in connection with such activity, are prohibited.

1.1.3**Direct merchants to the Shopify Theme Store.**

Your app must not allow merchants to download themes. Themes can only be installed via the Shopify Theme Store.

1.1.4**Use only factual information.**

Your app and app listing should only include factual information. Apps that falsify data to deceive merchants or buyers, such as fake reviews or false purchase notifications, violate our [Partner Program Agreement](https://www.shopify.ca/partners/terms) and our [Acceptable Use Policy](https://www.shopify.com/legal/aup).

1.1.5**Create unique apps.**

App must not be identical to other apps you've published to the Shopify App Store. Learn more about duplicate apps in our [Partner Program Agreement](https://www.shopify.com/ca/partners/terms?shpxid=60115daf-A6B9-4F0C-0646-BDC042F9B0C8#part-c).

1.1.6**Build single-merchant storefronts. Marketplaces should be sales channels.**

Apps that allow merchants to turn their stores into classifieds-style marketplaces cannot be distributed through the Shopify App Store. If you are a marketplace platform aiming to connect to Shopify in order to list products on your marketplace, consider submitting as a [sales channel](https://shopify.dev/docs/apps/selling-strategies/channels).

1.1.7**Always build Payment Gateway apps using the Payments API and after obtaining authorization.**

Payment Gateway apps must be authorized through an [application process.](https://shopify.dev/apps/payments/getting-started#overview) They must be built using the [Payments API](https://shopify.dev/docs/api/admin-rest/2023-10/resources/payment).

1.1.8**Build apps for Shopify POS only, not third-party systems.**

Shopify is not currently accepting apps that connect to a POS system outside of Shopify. This applies to all apps that connect to a POS system outside of Shopify.

1.1.9**Obtain explicit buyer consent before adding charges.**

Apps can't automatically add or pre-select optional charges to a buyer's cart that increase the total checkout price. Apps can only add optional charges to carts or at checkout after displaying the additional cost in a manner that is clear to the buyer, and upon obtaining explicit buyer consent.

1.1.10**Maintain the cheapest shipping option as default.**

Apps can’t alter or re-order shipping options in a manner that increases the default shipping price. The cheapest shipping option must always be selected by default. This restriction doesn’t apply to non-shipping delivery methods, such as in-store pickup, local delivery, and pickup points.

1.1.11**Offer browser extensions as optional features only.**

Browser extensions are only permitted as an optional feature.

1.1.12**Build web-based apps.**

Your app must not require a desktop app to function.

1.1.13**Duplicate only authorized product information.**

Your app should only duplicate product information that the merchant has the proper permission to use: their own products, officially licensed or dropshipped products. Marketing claims like "import from any store in the world" or "copy the product information from any website", whether using your app or a Chrome extension, are not acceptable.

1.1.14**Don't connect merchants to external agencies and developers.**

Apps that connect merchants to agencies and freelancers cannot be distributed through the Shopify App Store.

1.1.15**Process refunds only through the original payment processor.**

Your app must not offer methods for processing refunds outside of the original payment processor. If your app issues store credits during a refund, it must use either [refundCreate](https://shopify.dev/docs/api/admin-graphql/latest/mutations/refundCreate) or [returnProcess](https://shopify.dev/docs/api/admin-graphql/latest/mutations/returnProcess) to do so.

1.1.16**Don't provide capital lending.**

Apps that provide capital funding (including but not limited to loans, cash advances, and purchase of receivables) cannot be distributed through the Shopify App Store. These types of services are difficult to monitor on an ongoing basis, and in a manner that makes sure merchants are protected from unsound lending practices.

#### 1.2 Bill through the Shopify Billing API or Shopify App Pricing

Apps that use off-platform billing cannot be distributed through the Shopify App store, unless you've been notified otherwise by Shopify. Your app must use [Shopify App Pricing](https://shopify.dev/docs/apps/launch/billing/shopify-app-pricing) or the [Shopify Billing API](https://shopify.dev/docs/apps/launch/billing) for all app charges and be free of billing related errors.

Show requirements

1.2.1**Use Shopify App Pricing or the Shopify Billing API.**

Apps that use off-platform billing cannot be distributed through the Shopify App store. Your app must use [Shopify App Pricing](https://shopify.dev/docs/apps/launch/billing/shopify-app-pricing) or the [Shopify Billing API](https://shopify.dev/docs/apps/billing) for any app charges.

1.2.2**Implement Shopify App Pricing or the Shopify Billing API correctly.**

If your app has any charges, it must correctly implement [Shopify App Pricing](https://shopify.dev/docs/apps/launch/billing/shopify-app-pricing) or the [Shopify Billing API](https://shopify.dev/docs/apps/billing) to ensure that it can accept, decline and [request approval for charges again on reinstall](https://shopify.dev/docs/apps/billing/subscriptions).

1.2.3**Allow pricing plan changes.**

Your app must allow merchants to upgrade and downgrade their pricing plan without having to contact your support team or having to reinstall the app. This includes ensuring that the charges are successfully processed in the application charge history page in the merchant admin.

#### 1.3 Always use honest and transparent review practices

Developers are expected to maintain honesty and integrity in their interactions with merchants, buyers, and the Shopify ecosystem. Reviews that are fake and/or incentivized are strictly prohibited. Developers violating these policies may face consequences such as the removal of reviews, demotion or delisting of your app, or termination of your Partner account.

Show requirements

1.3.1**Do not offer incentives for reviews.**

Asking for reviews must be done so in neutral language. It is forbidden to offer incentives or withhold features in exchange for reviews, regardless of whether this occurs through the app or external channels.

## 2. Functionality

Apps must deliver on the features described in their app store listing. The core functionality must work properly and comply with the Shopify [Partner Program Agreement](https://www.shopify.com/ca/partners/terms) and [Acceptable Use Policy](https://www.shopify.com/legal/aup).

#### 2.1 Create reliable and user-friendly apps

Merchants should have a positive experience when using your app. Your app should be easy to use and free from errors that prevent your core functionality from working.

Show requirements

2.1.1**Build apps without critical errors to ensure review completion.**

Your app must be free from user interface bugs, display issues, or error pages that fully prevent completion of the review. Web errors such as 404's, 500's, 300's, and etc are not acceptable.

2.1.2**Build apps without even minor errors to ensure review completion.**

Your app must be free from user interface bugs, display issues, or error pages that partially prevent completion of the review.

2.1.3**Have a user interface (UI) that merchants can interact with.**

All apps in the Shopify App Store must be operational through a UI regardless of how the app is launched. Operational errors (errors within an apps' functionality) are acceptable, web errors (404's, 500's, 300's) are not acceptable.

2.1.4**Synchronize data accurately.**

If your app synchronizes data with Shopify, then it must ensure accurate and correct transfer of data between both platforms. This means ensuring that all synchronized data is consistent across the Shopify admin, your app, and any additional platforms your app depends on.

#### 2.2 Use Shopify's APIs and platform tools

Your app must use [Shopify's APIs](https://shopify.dev/docs/api) and integrate with platform tools like [Shopify App Bridge](https://shopify.dev/docs/api/app-bridge) to provide an embedded admin experience. Admin extensions must provide novel, feature-complete functionality without promotions or inappropriate modal launches.

Show requirements

2.2.1**Use Shopify APIs.**

Your app must be configured to use [Shopify's API](https://shopify.dev/docs/admin-api) to ensure it best serves merchants. Apps that don't use or need any Shopify APIs are not permitted.

2.2.2**Provide a consistent embedded experience.**

Your app must provide a consistent embedded experience by ensuring that any off-platform features are integrated directly within the Shopify Admin.

2.2.3**Use the latest version of Shopify App Bridge.**

As of March 13th, 2024, all apps must use [the latest Shopify App Bridge](https://shopify.dev/docs/api/app-bridge-library#getting-started) by adding the `app-bridge.js` script tag before any other script tags. We recommend adding it to the of each document of your app or as the first script element.

2.2.4**Use the GraphQL Admin API.**

As of April 1, 2025 all new public apps must be built exclusively with the [GraphQL Admin API](https://shopify.dev/docs/api/admin-graphql/latest). As of October 1, 2024 the [REST Admin API](https://shopify.dev/docs/api/admin-rest) is considered a legacy API and should no longer be used. For details and migration steps, visit the [migration guide](https://shopify.dev/docs/apps/build/graphql/migrate).

2.2.5**Admin extensions must be feature-complete.**

[Admin UI blocks, admin actions](https://shopify.dev/docs/apps/design-guidelines/app-structure#admin-ui-extensions), and [admin links](https://shopify.dev/docs/apps/build/admin/admin-links) must be feature-complete, and provide novel functionality or content.

2.2.6**Don't display promotions or advertisements in admin extensions.**

Don't use [admin UI blocks, admin actions](https://shopify.dev/docs/apps/design-guidelines/app-structure#admin-ui-extensions), or [admin links](https://shopify.dev/docs/apps/build/admin/admin-links/add-admin-links) to promote your app, promote related apps, or request reviews.

2.2.7**Only launch Max modal with merchant interaction.**

Max modal (formerly known as full screen mode) must not launch without a merchant interaction. [Max modal](https://shopify.dev/docs/apps/design-guidelines/app-structure#behavior) can't be launched from the app navigation menu.

2.2.8**Sidekick app extensions must align with stated app functionality.**

[Sidekick app extensions](https://shopify.dev/docs/apps/build/sidekick) must operate within the scope of your app’s core functionality. To ensure platform integrity and merchant transparency, your extension configuration, public [App Store listing](https://shopify.dev/docs/apps/launch/shopify-app-store/best-practices#app-store-listing-content), and actual runtime execution must be materially consistent. Tools, intents, and actions exposed to Sidekick must be a logical representation of what your app does for the merchant on its own surface.

2.2.9**Don't display promotions, advertisements, or cross-sell other services in Sidekick app extensions.**

Don't use [Sidekick app extensions](https://shopify.dev/docs/apps/build/sidekick) to promote your app, promote related apps, or request reviews.

#### 2.3 Provide seamless and secure installation

Apps can only be installed and initiated on Shopify services. Merchants expect a seamless experience when installing and uninstalling your application.

Show requirements

2.3.1**Initiate installation from a Shopify-owned surface.**

Apps must be installed and initiated only on Shopify services. Your app must not request the manual entry of a myshopify.com URL or a shop's domain during the installation or configuration flow.

2.3.2**Authenticate immediately after install.**

Your app must immediately authenticate using OAuth before any other steps occur. Merchants should not be able to interact with the user interface (UI) before OAuth.

2.3.3**Redirect to the app UI after installation.**

Your app must redirect merchants to the user interface (UI) after they accept permissions access on the OAuth handshake page.

2.3.4**Require OAuth authentication immediately after reinstall.**

Help merchants easily return to workflows in your app if they choose to reinstall it. Your app must immediately authenticate using [OAuth](https://shopify.dev/docs/apps/auth/oauth) before any other steps occur, even if the merchant has previously installed and then uninstalled your app.

## 3. Security

App security is critical for protecting merchants' businesses and their data. Before submitting your app, ensure it's secure and follows best practices to minimize risk.

#### 3.1 Secure data with valid TLS/SSL certificates

Information must be exchanged securely to ensure merchant and/or buyer data is protected when in transit.

Show requirements

3.1.1**Use a valid TLS/SSL certificate.**

All data exchanged between a client (such as a merchant's web browser) and your app server should be encrypted using Transport Layer Security (TLS) to ensure that any data transmitted can only be read by your application server. Websites secured by a TLS certificate will display HTTPS and the small padlock icon in the browser address bar. Your app must have a valid [TLS/SSL certificate](https://shopify.dev/docs/apps/store/security/tls-certificates) without any errors.

#### 3.2 Request only necessary access scopes

Your app must request only the access scopes that are necessary for your app to function properly. You may be requested to provide proof that the access scopes you've requested are required for your app to function properly. For scopes that are not required for all merchants, we strongly recommend using [optional scopes](https://shopify.dev/docs/apps/build/authentication-authorization/app-installation/manage-access-scopes#optional-scopes).

Show requirements

3.2.1**Request read\_all\_orders access scope only if it provides necessary app functionality.**

If your app is accessing the `read_all_orders` scope, it must demonstrate the need for this scope.

3.2.2**Request write\_payment\_mandate scope only if it provides necessary app functionality.**

If your app is accessing the `write_payment_mandate` scope, it must demonstrate the need for this scope.

3.2.3**Request write\_checkout\_extensions\_apis scope only if it provides necessary app functionality.**

If your app is accessing the `write_checkout_extensions_apis` scope, it must demonstrate the need for this scope.

3.2.4**Request read\_advanced\_dom\_pixel\_events scope only if it provides necessary app functionality.**

If your app is accessing the `read_advanced_dom_pixel_events` scope, it must demonstrate the need for this scope. You must use this scope to either implement a heatmap or session recording functionality on checkout pages.

3.2.5**Request read\_checkout\_extensions\_chat scope only when required.**

If your app is accessing the `read_checkout_extensions_chat` scope, it must demonstrate the need for this scope.

## 4. App Store Listing

Your app store listing is a merchant's first impression of your app. Create clear, accurate listings that help merchants understand your app's features, pricing, and value.

#### 4.1 Brand your app name uniquely and consistently

Your app must have a unique name that distinguishes it from other apps and is used consistently across all Shopify and developer-controlled surfaces.

Show requirements

4.1.1**App name fields must be similar.**

Your app name needs to match, or be similar, between your Developer Dashboard (edited through TOML file or when releasing a new version) and your App Submission form (which controls the App Store listing). "Similar" means that any variations of the name contain common words.

4.1.2**Use a unique name for your app.**

Every app must have its own unique, recognizable name that leads with your distinctive brand identifier. Your app's name must not be identical or confusingly similar to another app, developer, brand, or Shopify product.

#### 4.2 Keep pricing accurate and in designated areas

Merchants scan specific places in app listings to quickly understand costs and value. Do not include pricing information in undesignated areas like your app logo, to prevent merchant confusion. Keep this information in Pricing details.

Show requirements

4.2.1**Provide accurate and complete pricing information.**

Ensure your pricing information includes all pricing options such as, free trial time and charge details.

4.2.2**Don't include pricing information in images.**

Do not include pricing information in the images of your app listing (including within your app icon). Pricing information should only appear in the Pricing details section of your app listing.

4.2.3**Don't include pricing information elsewhere in the listing.**

Merchants scan specific places in app listings to quickly understand costs and value. Do not include pricing information in undesignated areas like your app logo, to prevent merchant confusion. Keep this information in Pricing details.

#### 4.3 Provide accurate and truthful listing information

Your app store listing should be truthful and accurate. Merchants should know based on your listing if your app will work for them.

Show requirements

4.3.1**Indicate if the Online Store sales channel is required.**

Help merchants understand if they need to be using the Online Store channel (rather than a custom storefront) to get the most value from your app. If your app embeds features in a merchant's Online Store, then select "Merchant must have online store" under the Sales channel requirements section of your app listing form.

4.3.2**Only claim to be published in languages that you fully supported.**

The Languages section of your app listing must only list languages in which merchants can use your app's UI. If your app offers multiple languages for customer-facing features, you may describe these in the App Details or media gallery sections of your app listing (optional).

4.3.3**Don't use stats, data, or unsubstantiated claims such as guarantees in the listing.**

Do not use any statistics or data in your app's listing content, overview of the app, and/or app introduction. This includes verifiable and unverifiable information. Focus on your app's benefits when rewriting your listing and avoid using terms like "the first", "the best", or "the only".

4.3.4**Don't use stats, data, or unsubstantiated claims such as guarantees in images.**

Do not use any statistics or data in your app's listing content, overview of the app, and/or app introduction. This includes verifiable and unverifiable information. Focus on your app's benefits when rewriting your listing and avoid using terms like "the first", "the best", or "the only".

4.3.5**Use accurate tags.**

Your tags should accurately reflect the primary function(s) of your app. Make sure to review the [definitions of our categories and tags](https://shopify.dev/apps/store/categories#list-of-app-categories-subcategories-and-tags) to help merchants find your app.

4.3.6**Don't include reviews or testimonials in images.**

Do not use reviews and testimonials in your app's listing and other undesignated app listing areas. Reviews will be added to your listing page based on merchant feedback.

4.3.7**Don't include reviews or testimonials in the listing.**

Do not use reviews and testimonials in your app's listing and other undesignated app listing areas. Reviews will be added to your listing page based on merchant feedback.

4.3.8**Indicate geographic requirements.**

Specify geographic requirements or specific API permissions in your app's listing if they are needed for your app to function. Only merchants in the correct geographic location or on a plan with the required API permissions will then be able to install your app.

#### 4.4 Provide clear assets and descriptions

Your app store listing content should describe your app's features at a high level. When creating your app store listing content, don't reference your other apps and services in your app store listing content.

Show requirements

4.4.1**Write effective app card subtitles.**

The app card subtitle helps merchants to quickly understand what your app does, and what sets it apart from others. Summarize your app in a concise phrase, and explain the value of your app. Don't add keywords to your subtitle with the intent of improving search performance. Don't use personal merchant information without consent from the merchant. Don't include any data or statistics. Share this information on your website and landing pages instead.

4.4.2**Follow the guidelines for app details.**

Your app details must include a clear explanation of your app's functionality with enough information about features for merchants to confidently install. Avoid excessive use of marketing keywords or only having a structured feature list.

4.4.3**Don't misuse Shopify brand in graphics.**

Do not use our trademarks in your app icon, banner, or screenshots. Our trademarks can only be used to communicate your app's compatibility with Shopify in accordance with our [brand guidelines](https://www.shopify.com/brand-assets#TrademarkGuidelines).

4.4.4**Provide clear, focused images.**

Images should primarily show your app's actual user interface and features. Screenshots should not include desktop backgrounds or browser windows. Feature images and screenshots that solely contain your app logo are not permitted.

4.4.5**Provide unique images.**

Each image in your app listing must be unique. Screenshots should showcase different features, views, or states of your app. Don't submit duplicate or near-identical images.

#### 4.5 Ensure your submission is complete and accurate

Ensure your app is properly classified and submit with complete, up-to-date documentation and credentials for review.

Show requirements

4.5.1**Submit Sales Channels apps in their respective category.**

If your app meets Shopify's [definition](https://shopify.dev/docs/apps/build/sales-channels) of a Sales Channel, [turn your app into a Sales Channel](https://shopify.dev/docs/apps/build/sales-channels/start-building#step-2-turn-an-app-into-a-sales-channel-app) and comply with all requirements before submitting your app for review.

4.5.2**Submit as a regular app if not a Sales Channel.**

If your app doesn't meet Shopify's [definition](https://shopify.dev/docs/apps/build/sales-channels) of a Sales Channel, remove the [Sales Channel configuration](https://shopify.dev/docs/apps/build/sales-channels/channel-config-extension) and then deploy the change to configure your app into a regular app.

4.5.3**Include a demo screencast.**

Include a screencast to demonstrate your app’s onboarding and features as described in its listing. We require more information in your demo screencast to be able to set up and test the app successfully. Ensure the video offers clear step-by-step instructions showing how to set up your apps core features. The screencast should be in English or have English subtitles.

4.5.4**Include test credentials.**

Include account credentials in your [testing instructions](https://screenshot.click/12-40-wvht7-gytqd.png) so we can review your app. Make sure to keep these account credentials up to date.

4.5.5**Include functional test credentials.**

If your app requires login credentials, then the credentials you provide for review must be valid, and grant full access to the app's complete feature set. Double-check all credentials before submission to avoid issues during review.

4.5.6**Provide an emergency developer contact.**

Add an emergency developer contact to your Partner Dashboard. This contact will receive critical technical information for maintaining your Shopify app. Add an emergency developer contact on the Partner account settings page, or learn about setting up [developer contacts](https://shopify.dev/docs/api/usage/versioning/updates#update-your-emergency-developer-contact-details).

## 5. Category-specific

Certain app types have unique impacts on merchant operations and require different APIs, extensions, and implementations.

These category-specific requirements ensure these apps properly serve their use cases. Note that some apps may fall into multiple categories.

#### 5.1 Online store

**Extend themes properly with app extensions**. Modify themes only through theme app extensions, not through direct code changes.

Show requirements

5.1.1**Use theme app extensions.**

If your app modifies the merchant's theme, you need to use [theme app extensions](https://shopify.dev/docs/apps/build/online-store/theme-app-extensions). You or merchants should not make any code changes to the theme.

5.1.2**Properly show theme app extension in the storefront.**

Your app widget must be displayed properly and without any errors in the Theme Editor and Online Store.

5.1.3**Include detailed onboarding instructions for theme app extensions.**

Your app must have [detailed setup instructions](https://shopify.dev/docs/apps/online-store/theme-app-extensions/ux-guidelines#onboarding-for-app-embed-blocks) on how to install your app embeds and app blocks. We strongly recommend providing a [deep link](https://shopify.dev/docs/apps/build/online-store/theme-app-extensions/configuration#deep-linking) to help merchants install and preview your app in their theme.

5.1.4**Follow the criteria for App Name Branding.**

[App Name Branding](https://shopify.dev/docs/apps/launch/shopify-app-store/best-practices#app-name-branding) in storefront visual components is only permitted when customers directly interact with branded elements as a key aspect of their buying experience or removal would cause confusion or harm to customers. All other cases must use the [standard attribution](https://shopify.dev/docs/apps/launch/shopify-app-store/best-practices#app-name-branding) pattern only.

5.1.5**Send collected data back to the merchant.**

Return customer data collected through a Shopify hosted service to the merchant's Shopify admin. Specifically, this applies to data collected through the Online Store and Point of Sale sales channels. All data collected must be accessible to merchants and comply with the [Shopify API License and Terms of Use](https://www.shopify.com/legal/api-terms) under section 2.3.17.

#### 5.2 Payment

A payments app integrates with the Shopify admin to provide payment processing services.

**Build compliant integrations**. Payment apps require strict API usage, comprehensive testing documentation, functional payment flows, and checkout compliance. Revenue share agreement required.

Show requirements

5.2.1**Include detailed testing instructions for Payment apps.**

Prevent additional delays in your app store review by providing detailed testing instructions for your payment app. These include (1) a test store with the payments app installed; (2) the required credentials to enable installing the payments app for testing (for example, activation codes and login credentials); (3) Instructions on how to process a test payment and refund; and, if applicable, (4) a description of specific testing scenarios including installments/deferred payments and 3D Secure authentication.

5.2.2**Submit screencasts of the app's payment flow for all supported browsers.**

All Partners must submit screencasts of the app's payment flow for all [supported browsers](https://help.shopify.com/en/manual/shopify-admin/supported-browsers).

5.2.3**Provide a functional buyer flow on desktop and mobile devices.**

Your app’s buyer flow on desktop and mobile devices must redirect from Shopify’s checkout to your app’s payment flow, then back to Shopify’s order confirmation page. Refer to our [help document](https://shopify.dev/apps/payments/processing-a-payment#how-the-payments-app-flow-works) for more details.

5.2.4**Use correct payment API scopes.**

Payments apps aren't permitted to use any [Shopify APIs](https://shopify.dev/docs/api) other than the Payments Apps API and [mandatory webhooks](https://shopify.dev/docs/apps/webhooks/configuration/mandatory-webhooks).

5.2.5**Build payment apps as standalone, not embedded.**

Payment apps are not allowed to be embedded into the Shopify Admin. [Manage your embedded app configuration via TOML files.](https://shopify.dev/docs/apps/tools/cli/configuration) Once this is done, please ensure that it is possible to still setup the payments app and be redirected to the correct section in the Shopify Admin after the setup has been completed.

5.2.6**Allow buyers to cancel/abandon payment with the payment gateway.**

Modify your app to allow buyers to cancel or abandon the payment and be redirected back to Shopify’s checkout.

5.2.7**Redirect merchants back to the Shopify admin using the proper URL.**

Payment gateways must redirect merchants after they have completed all onboarding actions back to the Shopify admin using the following URL: [https://{shop}.myshopify.com/services/payments\_partners/gateways/${api\_key}/settings](https://%7Bshop%7D.myshopify.com/services/payments_partners/gateways/$%7Bapi_key%7D/settings)

5.2.8**Sign a revenue share agreement.**

Your app must obtain prior written consent from Shopify.

5.2.9**Match offsite payment information to checkout information.**

Your app’s offsite payment must present identical payment information to what was shown to the buyer on the checkout, particularly the currency and amount and buyer name.

5.2.10**Display only Shopify-approved payment methods.**

Update your app to display only Shopify [approved payment methods](https://shopify.dev/docs/apps/payments#supported-payment-methods) to the buyer. Your payment app must not process payment methods that include, but aren't limited to, Apple Pay, Google Pay, Shop Pay, PayPal, and Alipay. Shopify has a direct connection with providers that improves performance and checkout conversion for merchants.

5.2.11**Offer a test mode.**

Your payment app must have a test mode available so that merchants can charge, refund, and process test transactions.

5.2.12**Don't upsell any product or features in the payment flow.**

Do not include any product or feature upsells in your payment flow. All redirects must be limited to content intended for payment processing only.

5.2.13**Appropriately name payment apps.**

Ensure your app name reflects your payment gateway’s legal business name. Exclude marketing text or special characters and spacing. These distractions do not give your app any advantages. If a name appears to have been created with the purpose of gaining a higher listing on an alphabetized list, your app will be rejected.

5.2.14**Use a single Checkout UI extension with permitted targets.**

Your checkout UI extension can only use these targets: `Purchase.checkout.payment-option-item.hosted-fields.render-after`, `Checkout::PaymentMethod::Render`, `Purchase.checkout.payment-option-item.details.render`.

5.2.15**Don't use banners, logos, or graphics in the checkout interface.**

Any checkout interface customization needs to support payment completion. Banners, logos, or graphics can’t be used for error states or as decorative elements.

#### 5.3 Payment facilitator

A payment facilitator app works in tandem with a payment app. They enable merchants to display the related payment branding throughout their storefront.

**Offer free integrations**. These apps must be gateway-owned, non-transactional, and free for merchants.

Show requirements

5.3.1**Must be submitted by the partner who owns the payment gateway.**

Update your app to ensure that it doesn't modify an existing gateway. You must own the payment gateway that your app is seeking to integrate with.

5.3.2**Must be separate from any financial transactions.**

Apps that process financial transactions for payment gateways are prohibited from the Shopify App Store. Your app must add value to a merchant store, and not be used for the sole purpose of collecting data.

5.3.3**Must be free for merchants.**

Apps that integrate with an existing payment gateway must be provided to merchants at no extra cost.

#### 5.4 Purchase option

A purchase option app offers subscription-based products and services to merchants' customers.

**Build compliant purchase option integrations**. These apps require strict API compliance, comprehensive testing across browsers, functional customer portals with full subscription management, and clear pricing transparency.

Show requirements

5.4.1**Submit screencasts of purchase option app functionality for all supported browsers.**

Include a screencast of your app functioning from a Merchant's customers point of view on the [following listed browser and device](https://help.shopify.com/en/manual/shopify-admin/supported-browsers) types, in your testing instructions. We recommend using [browserstack](https://www.browserstack.com/) to address this.

5.4.2**Use correct subscription API scopes.**

Only API scopes that are required for your app to function are permitted. If your app requests the `write_customer_payment_methods` or the `write_own_subscription_contracts` scopes you may need to provide evidence that they're truly necessary for your app to function.

5.4.3**Don't use incorrect API scopes for purchase option apps.**

Ensure that your app is using the correct API scopes to reflect functionality. Apps that do not use the Selling Plan and subscription contract APIs properly, are not permitted on the App Store. For additional context, refer to [Purchase option access scopes](https://shopify.dev/docs/apps/selling-strategies/purchase-options#access-scopes).

5.4.4**Support all browser versions on desktop and mobile.**

Include a screencast of your app functioning from a Merchant's customers point of view on the [following listed browser and device](https://help.shopify.com/en/manual/shopify-admin/supported-browsers) types, in your testing instructions. We recommend using [browserstack](https://www.browserstack.com/) to address this.

5.4.5**Allow buyers to modify subscription payment methods.**

You must provide buyers with the option to modify their payment method associated with their subscription(s).

5.4.6**Enable merchants to create and manage selling plans from the product page and choose products for subscriptions.**

Implement the product extension to allow merchants to [create and manage selling plans](https://shopify.dev/docs/apps/selling-strategies/purchase-options/app-extensions#how-a-product-subscription-app-extension-looks-in-shopify) from the Shopify's admin product page. Merchants need to be able to choose which products they want as subscriptions.

5.4.7**Include access to your subscription portal through Shopify's customer portal.**

Include access to your app's subscription portal through the Shopify Customer portal. A single login must be used by buyers to access subscriptions and their order history.

5.4.8**Enable buyers to cancel their purchase option, or clearly communicate cancellation conditions.**

The purchase option app must include an in-product mechanism to allow a buyer to cancel or discontinue their purchase option, for example, a pre-order management portal or a cancel link in an email.

5.4.9**Navigate buyers to the customer portal.**

Apps that offer subscriptions must include navigation to a customer portal, both on the [order status page](https://help.shopify.com/en/manual/orders/status-tracking) and through a post-purchase email to a merchant's customers so that they're able to manage their subscription.

5.4.10**Display purchase options and charge timing clearly.**

Purchase option apps must clearly show buyers the price of the purchase option and when they will be charged. We recommend that this is done through a standalone app extension, as described in the [subscription UX guidelines](https://shopify.dev/docs/themes/pricing-payments/subscriptions/subscription-ux-guidelines#inline-pricing) and [deferred purchase option UX guidelines](https://shopify.dev/docs/themes/pricing-payments/preorder-tbyb/preorder-tbyb-ux-guidelines#product-forms).

5.4.11**Don't use selling plan and subscription contract APIs for prohibited actions.**

Ensure that your app abides by our selling plan and subscription contract [API terms](https://shopify.dev/docs/apps/selling-strategies/subscriptions/modeling#prohibited-actions). Actions like overbilling, and misuse of vaulting are prohibited. Any failure to avoid these prohibited actions constitutes a breach of the [Shopify API License and Terms of Use](https://www.shopify.com/legal/api-terms).

5.4.12**Link subscriptions directly to the linked Customers in Shopify Admin.**

Apps that offer subscriptions must include a direct link to [orders](https://shopify.dev/docs/apps/selling-strategies/subscriptions/contracts/create#order-page-in-the-shopify-admin) and [customers](https://shopify.dev/docs/apps/selling-strategies/subscriptions/contracts/create#customers-page-in-the-shopify-admin) in the Shopify admin from the purchase option.

5.4.13**Show buyers all of their purchased subscriptions in the Customer portal clearly.**

Display all of the buyers' purchased subscriptions through the customer portal. Details must include the associated products, delivery frequency, price, and order schedule. See [this document](https://shopify.dev/docs/apps/selling-strategies/purchase-options/customer-portal) for additional details.

5.4.14**Update multi-currency pricing and discount codes correctly on the product page.**

Update your app to support multi-currency functionality properly, so that pricing and discounts correctly show on the product page. Product pricing shouldn't be hard-coded as part of plan names or descriptions.

5.4.15**Link subscriptions directly to the linked Orders in Shopify Admin.**

Apps that offer subscriptions must include a direct link to [orders](https://shopify.dev/docs/apps/selling-strategies/subscriptions/contracts/create#order-page-in-the-shopify-admin) and [customers](https://shopify.dev/docs/apps/selling-strategies/subscriptions/contracts/create#customers-page-in-the-shopify-admin) in the Shopify admin from the purchase option.

5.4.16**Display selling plan name in the Cart page.**

Update your app to display the [selling plan name](https://shopify.dev/docs/api/liquid/objects/selling_plan#selling_plan-name) in the [cart page](https://shopify.dev/docs/themes/pricing-payments/purchase-options/subscription-ux-guidelines#cart-page). This name is used to identify the product's purchase option and its details.

5.4.17**Communicate pre-order delays with pre-stated shipment times to buyers.**

Ensure your app emails a merchant's customers when the merchant updates the [shipment date](https://shopify.dev/docs/apps/selling-strategies/purchase-options/deferred#delivery-policy) to a later date.

5.4.18**Clearly indicate details for prepaid items, including unit price, length of subscription, and price per delivery.**

Correct your app's widget feature to clearly show the unit cost for prepaid items and allow merchants to indicate additional shipping costs.

5.4.19**Enable variant-level product selection for buyers.**

Your app must have the ability to [select products at the variant level](https://shopify.dev/apps/subscriptions/app-extensions/create#create-a-new-selling-plan-group) within the Shopify Admin product section.

#### 5.5 Product sourcing

A product sourcing app allows merchants to source products from external suppliers and fulfill orders through their own fulfillment process.

**Build compliant product sourcing integrations**. These apps require compliant fulfillment workflows, secure payment processing, product restrictions adherence, and proper order payment verification.

Show requirements

5.5.1**Enable merchants to request fulfillment.**

Use the `fulfillmentOrderSubmitFulfillmentRequest` mutation to allow merchants to request fulfillment from the dropshipping app when an order is created. Refer to [this document](https://shopify.dev/docs/api/admin-graphql/latest/mutations/fulfillmentOrderSubmitFulfillmentRequest?example=Sends+a+fulfillment+request) for additional details.

5.5.2**Include details of cost of goods sold.**

Add the cost of products to the Cost field of the merchant's product page to comply with our product sourcing requirements.

5.5.3**Use a PCI compliant payment gateway.**

When charging merchants the cost of goods sold, you must use a PCI compliant payment gateway. All other charges associated with your app must go through Shopify's [Billing API](https://shopify.dev/docs/apps/billing).

5.5.4**Don't sell high risk products.**

Products that violate [Shopify's Acceptable Use Policy](https://www.shopify.com/legal/aup) and the Terms of Service for Payment Providers are prohibited. Products like cannabis, alcohol, pharmaceutical drugs, weapons and items listed as [prohibited businesses](https://www.shopify.ca/legal/terms-payments-us) are included in this restriction.

5.5.5**Verify payment before marking orders as fulfilled.**

Stop your app from automatically marking orders in a pending payment state as fulfilled to comply with our product sourcing requirements. This protects you from financial risk in case you receive a sudden influx of fraudulent orders.

#### 5.6 Checkout customization

A checkout customization app allows merchants to customize the checkout process to add custom UI or content.

**Extend checkout compliantly and transparently**. Checkout extensions require strict compliance including proper display, merchant-controlled content, customer consent for charges, accurate product data, and prohibited element restrictions.

Show requirements

5.6.1**Display checkout extensions properly in the storefront.**

Checkout extensions must be feature-complete, and provide novel functionality or content.

5.6.2**Give merchants full control over promotional content.**

Don't use checkout extensions to promote your app, promote related apps, or request reviews.

5.6.3**Don't display self-promotion or advertisements in checkout extensions.**

Don't use checkout extensions to promote your app, promote related apps, or request reviews.

5.6.4**Display the same product name, image, and cost as the product in the merchant’s store.**

Checkout UI extensions must display the same product name, image, and cost as the product in the merchant’s store.

5.6.5**Get explicit customer consent prior to making any changes that affect the order total in any way.**

Apps can’t automatically add or pre-select optional charges to a buyer’s cart that increase the total checkout price. Apps can only add optional charges to carts or at checkout after displaying the additional cost in a manner that is clear to the buyer, and upon obtaining explicit buyer consent.

5.6.6**Don't add countdown timers to the checkout.**

Checkout UI Extension apps must not add countdown timers to the checkout.

5.6.7**Use Chat UI components for customer service.**

Apps that implement Chat UI components on checkout pages must use them to provide customer service via real-time chat as their core feature.

5.6.8**Don't collect information that is already captured by the standard checkout form field.**

Extensions must not collect information, including personally identifiable information, that's already captured by a standard Shopify checkout form field.

5.6.9**Don't request payment information in checkout UI extension.**

The extension must not request that customers input payment information using a checkout UI extension

#### 5.7 Sales channel

A sales channel app lets merchants publish their products from their Shopify admin to your platform, whether they're selling online, on mobile apps, or through social media.

**Build compliant sales channel integrations**. Sales channel apps require strict UI and API compliance, proper account management workflows, Shopify checkout integration, and transparent merchant communication.

Show requirements

5.7.1**Add the \`read\_only\_own\_orders\` scope.**

You need the read\_only\_own\_orders scope to comply with our requirements. This scope ensures the sales channel can only read orders that it created and is added to the sales channel during review. Let us know if you're ready to have this flag added to your sales channel.

5.7.2**Build with Polaris components and style guide.**

Use the required [Polaris components](https://polaris.shopify.com/getting-started) and style guide to build your sales channel. Review how to [build a sales channel](https://shopify.dev/docs/apps/selling-strategies/channels/getting-started).

5.7.3**Use the ResourceFeedback API to communicate issues.**

Communicate product issues using feedback messages and the [ResourceFeedback API](https://shopify.dev/docs/api/admin-graphql/latest/mutations/shopresourcefeedbackcreate).

5.7.4**Provide details in the publishing section.**

Show the [current number](https://shopify.dev/tutorials/build-a-sales-channel-onboarding-and-account-connection-flow#front-end) of published products in the publishing section, and provide links to the Shopify bulk editor to view and manage those products.

5.7.5**Provide the marketplace link in the channel interface.**

Once products are uploaded to the marketplace, make sure merchants know how to navigate to the marketplace where their products are hosted. This can be in the form of a button or information in the instructions.

5.7.6**Communicate commission.**

Accurately communicate commissions to merchants to comply with our requirements.

5.7.7**Open terms and conditions in a new window.**

Include a terms and conditions section with links that open to a new window in your sales channel to comply with our requirements.

5.7.8**Use banners for approval or rejection of products.**

Communicate approval or rejection for use of your sales channel to merchants using the [banner component](https://polaris.shopify.com/components/feedback-indicators/banner).

5.7.9**Use Polaris cards in the publishing section.**

Create a publishing section using a card and the annotated layout shown.

5.7.10**Redirect to the account section after install.**

After install, redirect merchants to the [account section](https://shopify.dev/tutorials/build-a-sales-channel-onboarding-and-account-connection-flow#account-connection) using the account connection component.

5.7.11**Provide error feedback in the publishing section.**

Report [publishing errors](https://shopify.dev/tutorials/build-a-sales-channel-onboarding-and-account-connection-flow#step-3-manage-errors) for products in the publishing section to comply with our requirements.

5.7.12**Must allow merchants to disconnect their account.**

Allow merchants to [disconnect your sales channel](https://polaris.shopify.com/components/actions/account-connection?) from their store without contacting support to comply with our sales channel configuration requirements.

5.7.13**Display account information properly.**

Ensure that an account section, using the [account connection component](https://polaris.shopify.com/components/actions/account-connection#section-best-practices), is always visible and labelled with your channel name to comply with our sales channel configuration requirements.

5.7.14**Take customers to Shopify's Checkout.**

Must take customers from your Sales Channel to the Shopify checkout with [items pre-loaded in the cart](https://shopify.dev/docs/apps/checkout/cart-permalinks).

5.7.15**Must communicate account approval process.**

The approval process for your sales channel must be communicated to merchants using the [banner component](https://polaris.shopify.com/components/feedback-indicators/banner). Clearly communicate the [account status](https://shopify.dev/tutorials/build-a-sales-channel-onboarding-and-account-connection-flow#account-review-optional-step) the merchant is in. While merchants are awaiting approval, your sales channel must remain in a pending state.

5.7.16**Use Sales Attribution.**

You must use a [storefront access token](https://shopify.dev/docs/api/admin-rest/2024-04/resources/storefrontaccesstoken) to attribute an [order to your sales channel](https://shopify.dev/docs/apps/checkout/cart-permalinks/create#step-3-optional-attribute-an-order-to-a-sales-channel). Merchants rely on Shopify to attribute sales accurately.

5.7.17**Communicate eligibility issues.**

If the Sales Channel has any qualifying steps, including eligibility requirements or onboarding processes, this must be [communicated in the account connection form](https://shopify.dev/tutorials/build-a-sales-channel-onboarding-and-account-connection-flow#step-6-include-a-setup-flow-for-any-qualifying-steps-or-additional-onboarding-requirements).

5.7.18**Include a Navigation Icon.**

The Sales Channel must include a 16px by 16px navigation icon in SVG format, uploaded through the [Partner Dashboard](https://partners.shopify.com/organizations).

#### 5.8 Post purchase

A post purchase app allows merchants to upsell products to their customers after they've made a purchase.

**Create compliant upsell experiences**. Post-purchase apps require transparent and accurate upsells, limited consecutive requests, proper UI components, and restrictions on third-party content.

Show requirements

5.8.1**Add the \`write\_checkout\_extensions\_apis\` scope.**

The write\_checkout\_extensions\_apis scope has been granted for your app. Familiarize yourself with the [Shopify API License and Terms of Use](https://www.shopify.com/legal/api-terms) to ensure your app remains compliant.

5.8.2**Ensure the upsell is transparent to the buyer and include accept and decline buttons.**

To comply with [our guidelines](https://shopify.dev/apps/checkout/post-purchase/ux-guidelines-post-purchase-offers), update your upsell app to be transparent about all costs associated in a buyer's purchase. The buyer must be provided preset accept and decline options on the upsell. You may have set examples to choose from (ie. "Take the deal" / "No thanks", "Buy" / "Decline offer", etc.), however these cannot be modified by a merchant.

5.8.3**Show the same product information on post purchase upsell.**

Ensure your app displays the same product title, product price, and [product image](https://shopify.dev/api/checkout-extensions/components/image) in your upsell as the merchant’s store.

5.8.4**Limit consecutive requests displayed to customers.**

Limit consecutive post purchase requests to a maximum of 3 that appear to buyers.

5.8.5**Correctly assign the purchase option category for each selling plan created.**

App must correctly assign the [purchase option category](https://shopify.dev/docs/apps/selling-strategies/purchase-options#purchase-option-category) in the API for subscriptions, pre-orders, and try before you buy.

5.8.6**Redirect to the order confirmation page when done.**

Post purchase apps must redirect buyers back to the order confirmation page upon completion.

5.8.7**Use the calloutbanner component to display callout banners.**

Use the [checkout CalloutBanner](https://shopify.dev/api/checkout-extensions/components/calloutbanner) to display one upsell Callout Banner at the top of the page. Include introductory text, the product name, and discount.

5.8.8**Update price breakdown to reflect price changes.**

Display the correct total cost of the upsell offer to the buyer. Your app must dynamically update and reflect price changes if the buyer adjusts the product's quantity or variants.

5.8.9**Don't display third party ads or promotions.**

Your post purchase application must not include ads or promotions to other services outside of the merchant’s shop.

5.8.10**Exclude order tracking/status from your post purchase page.**

Post purchase apps must not have any order tracking or status functionality in their post-purchase page.

#### 5.9 Mobile app builders

A mobile app builder lets merchants create a mobile app based on their online store.

**Configure mobile apps as sales channels**. These apps must operate as sales channels for checkout functionality and inform merchants about app store submission processes and requirements.

Show requirements

5.9.1**Convert mobile app builders into sales channel.**

Convert your mobile app builder [into a sales channel](https://shopify.dev/docs/apps/build/sales-channels/channel-config-extension) to allow checkout creation by the apps it builds. Make this change to comply with our mobile app builder requirements.

5.9.2**Include submission info for the Apple App Store and Google Play.**

Include information about either the Apple App Store or the Google Play store app submission process. Inform the merchant about their wait times and app requirements to comply with our mobile app builder requirements.

5.9.3**Provide app theme customization or presets.**

Include either a customizable theme builder or preset theme options in your app to comply with our mobile app builder requirements.

#### 5.10 Donation

A donation app allows merchants to collect donations from their customers.

**Build compliant integrations and be charity-verified**. Donation apps require charity verification, compliant payment processing through Shopify Checkout, transparent cost and proof documentation, and proper donation widget setup.

Show requirements

5.10.1**Give instruction on how to hide add-to-cart on donation products.**

App must include [instructions on how to hide the add-to-cart button](https://help.shopify.com/en/manual/online-store/themes/customizing-themes/hide-add-to-cart-buttons) for any donation product that is created.

5.10.2**Provide merchants with proof of donation.**

Donation distribution apps must provide merchants with verifiable proof of donations made within the app interface. This cannot be a tax receipt.

5.10.3**Indicate operating cost in UI and listing.**

If a portion of the donations are being used to offset the cost of the app, provide a percentage value indicating how much in the user interface as well as the pricing section of the listing.

5.10.4**Verify charitable status or partnership.**

You must provide proof of your charitable status in your app.

5.10.5**Use a theme app block to add donation products.**

Add a widget to buy the donation product to the product page, cart page or checkout page. This can be implemented using [Theme App Extensions](https://shopify.dev/docs/apps/online-store/theme-app-extensions) or [Checkout UI Extensions](https://shopify.dev/docs/api/checkout-ui-extensions).

5.10.6**Collect donation funds using PCI-compliant third party gateways or the Billing API.**

Ensure your app collects funds using the [Billing API](https://shopify.dev/docs/apps/billing) or with a [PCI-compliant](https://www.shopify.com/security) third party gateway.

5.10.7**Process customer’s donations through Shopify Checkout.**

All customer donations must be routed through Shopify Checkout. Apps that redirect buyers to an external checkout are prohibited.

#### 5.11 Blockchain

A blockchain app allows merchants to sell, transfer, or modify non-fungible tokens (NFTs).

**Build compliant integrations and get payment partner approval**. Blockchain apps require payment partner approval, primary sales support only, comprehensive fulfillment tracking, data privacy protections, and strict compliance with securities regulations.

Show requirements

5.11.1**Don't sell, transfer, or modify fungible tokens unless they are a payment partner.**

You must not sell, transfer, or modify fungible tokens unless you are a payment partner that has been approved by the Shopify Payments Team. For more information on becoming a payment partner, read the [Extensions for payments](https://shopify.dev/apps/payments) documentation.

5.11.2**Provide an interface to review the state of each NFT order.**

A user interface is required to provide the merchant with the status of each NFT fulfillment status and subsequent fulfillment interactions with a customer.

5.11.3**Write blockchain transaction ID by order fulfillment tracking\_numbers.**

For each fulfilled NFT, blockchain apps must write the blockchain transaction ID to the order's [Fulfillment tracking\_number](https://shopify.dev/docs/api/admin-graphql/2024-04/objects/FulfillmentTrackingInfo#field-fulfillmenttrackinginfo-number) field, and a valid block scanner URL for the NFT fulfillment transaction to the order's [Fulfillment tracking\_url](https://shopify.dev/docs/api/admin-graphql/2024-04/objects/FulfillmentTrackingInfo#field-fulfillmenttrackinginfo-url) field. If needed, the name of the blockchain, fork, or network can also be written to the order's [Fulfillment tracking\_company](https://shopify.dev/docs/api/admin-graphql/2024-04/objects/FulfillmentTrackingInfo#field-fulfillmenttrackinginfo-company) field.

5.11.4**Prevent merchants from listing NFTs until they are approved.**

The app must block merchants from listing NFTs as products while Shopify Payments is active in the shop, until the merchant is approved to sell NFTs.

5.11.5**Provide an NFT claim message.**

With respect to the minting method configured for a given NFT, a merchant’s NFT fulfillment actions in the Shopify admin must result in a timely NFT claim message being sent to the customer.

5.11.6**Allow creating and reviewing requests from embedded app.**

A merchant needs to be able to maintain the context (requests and creations) of all of the NFTs they offer from a single interface, [the embedded app home](https://shopify.dev/docs/apps/admin/embedded-app-home).

5.11.7**Include only creator royalties, not secondary royalties.**

Do not write any secondary royalties (for example, non-creator royalties) into your NFTs.

5.11.8**NFTs must not qualify as a security or regulated financial instrument.**

Apps should in no event facilitate the sale or marketing of NFTs that represent or qualify as securities or other regulated financial instruments, or activities related to securities or other regulated financial instruments.

5.11.9**Support primary sales only.**

Apps are presently only able to support the primary sales of NFTs on Shopify. A gallery display of NFTs on a Shopify store that are not represented by products or hosted in the admin is not supported.

5.11.10**Allow buyers to create a wallet after buying NFT.**

The Buyer must be provided with the facility to onboard onto the blockchain ecosystem, by providing a wallet creation mechanism.

5.11.11**Ensure no personal data is written or stored on-chain.**

You must make sure that no personal data is written or stored on-chain.

5.11.12**Don't allow parties to edit destination email.**

Ensure that the destination contact information for the NFT claim entered at checkout cannot be redirected to a new recipient without the express review and confirmation of the customer, merchant, NFT application developer, and the Shopify Blockchain team.

5.11.13**Enable Shopify to complete end-to-end test upon submission.**

The App Review Team must be able to perform end-to-end testing of an NFT distribution application, including the creation, minting, and delivery of NFTs where necessary, in order to validate all app functionality. Include all relevant testing instructions (for example, test store, wallet, and screencasts) in Part G of the app submission form.
