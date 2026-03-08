import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, BookOpen, Check, Link2, ExternalLink, Copy,
  ChevronRight, AlertCircle, Clock, DollarSign, Shield
} from 'lucide-react'
import { useState } from 'react'
import { usePlatformConnections } from '../hooks/usePlatforms'

// Full step-by-step guides for every platform
const GUIDES = {
  shopify: {
    name: 'Shopify',
    color: '#95BF47',
    timeEstimate: '30 minutes',
    cost: '$39/month after free trial',
    overview: "Shopify is the easiest way to build your own online store. You'll have your own website where customers can buy directly from you. Togogo connects to Shopify automatically — once connected, we can list products to your store for you.",
    beforeYouStart: [
      'An email address (Gmail, Outlook, etc.)',
      'A name for your store (you can change this later)',
      'A payment method for the Shopify subscription (credit/debit card)',
    ],
    steps: [
      {
        title: 'Create your Shopify account',
        detail: "Go to shopify.com and click 'Start free trial'. Enter your email, create a password, and pick a store name. Don't worry about the name — you can change it later. Shopify will ask you some questions about your business. You can skip these or answer them, it doesn't matter for now.",
        tip: "Use the same email you used to sign up for Togogo. This makes things simpler.",
      },
      {
        title: 'Choose a theme (how your store looks)',
        detail: "Shopify gives you a free theme called 'Dawn'. This is perfectly fine to start with. You can browse other free themes in the Theme Store later. Don't spend too long on this — you can always change it.",
        tip: "Don't buy a paid theme yet. Free themes work great. You can upgrade later when you're making sales.",
      },
      {
        title: 'Set up payments',
        detail: "Go to Settings (bottom left) then click 'Payments'. Enable 'Shopify Payments' — this lets you accept credit cards. If Shopify Payments isn't available in your country, you can use PayPal or Stripe instead. Just follow the on-screen steps.",
        tip: "Shopify Payments has the lowest fees. Enable it if it's available in your country.",
      },
      {
        title: 'Set up shipping',
        detail: "Go to Settings then 'Shipping and delivery'. For dropshipping, you'll want to set up shipping rates. The easiest option is 'Free shipping' — build the shipping cost into your product price. Customers love free shipping.",
        tip: "Free shipping converts better. Just add a few dollars to your product prices to cover it.",
      },
      {
        title: 'Connect Shopify to Togogo',
        detail: "This is the magic part. Go back to Togogo, head to Platforms, and click 'Connect' on Shopify. Enter your store name (the part before .myshopify.com). Togogo will open a Shopify page asking you to approve the connection. Click 'Install app'. That's it — Togogo can now list products to your store automatically.",
        tip: "Your store name is in your Shopify URL. For example, if your URL is mystore.myshopify.com, enter 'mystore'.",
      },
      {
        title: 'Pick a Shopify plan',
        detail: "Your free trial lasts 3 days (then $1/month for 3 months). When you're ready, pick the 'Basic' plan at $39/month. This is all you need to start. Don't upgrade until you're making consistent sales.",
        tip: "Start with Basic. You can upgrade anytime. The higher plans are for bigger businesses.",
      },
    ],
    connectAction: 'shopify',
  },

  woocommerce: {
    name: 'WooCommerce',
    color: '#7F54B3',
    timeEstimate: '1 hour',
    cost: 'Free plugin (hosting ~$5-15/month)',
    overview: "WooCommerce is a free plugin for WordPress. If you already have a WordPress website, you can add a store to it in minutes. If you don't have WordPress yet, you'll need to set up hosting first. Togogo connects using your store's API keys.",
    beforeYouStart: [
      'A WordPress website (or a web host to create one)',
      'Admin access to your WordPress dashboard',
      'A payment processor (PayPal, Stripe, or similar)',
    ],
    steps: [
      {
        title: "If you don't have WordPress yet — get hosting",
        detail: "You need a web host to run WordPress. Good budget options are Hostinger ($2.99/month), Bluehost ($2.95/month), or SiteGround ($3.99/month). All of them have 'one-click WordPress install'. Sign up, install WordPress, and you'll have your own website.",
        tip: "Hostinger is the cheapest and easiest for beginners. Their one-click install sets up WordPress in 2 minutes.",
      },
      {
        title: 'Install WooCommerce',
        detail: "Log into your WordPress dashboard (yourdomain.com/wp-admin). Go to Plugins then 'Add New'. Search for 'WooCommerce'. Click 'Install Now' then 'Activate'. WooCommerce will walk you through a setup wizard — follow the steps.",
        tip: "The setup wizard asks about your business. Just pick the options that seem right — you can change everything later.",
      },
      {
        title: 'Set up payments',
        detail: "In the setup wizard, enable WooCommerce Payments (powered by Stripe) or PayPal. If you prefer, you can add Stripe manually later under WooCommerce then Settings then Payments. Just follow the on-screen instructions.",
        tip: "WooCommerce Payments (Stripe) is the easiest. You just need an email and bank details.",
      },
      {
        title: 'Generate API keys for Togogo',
        detail: "Go to WooCommerce then Settings then 'Advanced' then 'REST API'. Click 'Add Key'. For the description, type 'Togogo'. Set permissions to 'Read/Write'. Click 'Generate API Key'. You'll see a Consumer Key (starts with ck_) and Consumer Secret (starts with cs_). Copy both — you'll need them in the next step.",
        tip: "Keep your API keys safe. Don't share them with anyone except Togogo. If you lose them, you can always generate new ones.",
        important: true,
      },
      {
        title: 'Connect WooCommerce to Togogo',
        detail: "Go back to Togogo, head to Platforms, and click 'Connect' on WooCommerce. Enter your store URL (e.g., https://yourstore.com), your Consumer Key, and your Consumer Secret. Togogo will test the connection. If it works, you'll see a success message and your store is connected.",
        tip: "Make sure your store URL starts with https:// and doesn't have a trailing slash.",
      },
    ],
    connectAction: 'woocommerce',
  },

  squarespace: {
    name: 'Squarespace',
    color: '#000000',
    timeEstimate: '45 minutes',
    cost: '$33/month (Commerce Basic)',
    overview: "Squarespace makes beautiful websites. Their templates are gorgeous and everything is drag-and-drop. If you want a store that looks really professional without hiring a designer, Squarespace is a great choice. Togogo connects via their API.",
    beforeYouStart: [
      'An email address',
      'A payment method for the Squarespace subscription',
      'Some ideas for your store name and what you want to sell',
    ],
    steps: [
      {
        title: 'Create your Squarespace account',
        detail: "Go to squarespace.com and click 'Get Started'. Pick a template — browse the 'Online Store' category for commerce-ready designs. Click 'Start with this design'. Enter your email and create a password.",
        tip: "Pick a template from the 'Online Store' category. These already have shopping features built in.",
      },
      {
        title: 'Customise your site',
        detail: "Use the editor to change colours, fonts, and images. Click on any element to edit it. Add your store name and a short description. Don't spend hours on this — getting your store live is more important than making it perfect.",
        tip: "Done is better than perfect. You can tweak the design anytime. Focus on getting products up first.",
      },
      {
        title: 'Set up commerce',
        detail: "Go to Commerce in the left sidebar. Follow the setup steps to connect a payment processor (Stripe is recommended). Set up your shipping options and tax settings for your country.",
        tip: "You need a Commerce plan ($33/month) to sell products. The basic website plan doesn't include commerce.",
      },
      {
        title: 'Connect to Togogo',
        detail: "Go to Togogo Platforms page and click 'Connect' on Squarespace. This will open a Squarespace authorization page. Click 'Allow' to give Togogo permission to manage your products. Once connected, Togogo can list products directly to your Squarespace store.",
        tip: "Make sure you're logged into Squarespace in the same browser before clicking Connect.",
      },
    ],
    connectAction: 'squarespace',
  },

  bigcommerce: {
    name: 'BigCommerce',
    color: '#34313F',
    timeEstimate: '1 hour',
    cost: '$39/month after free trial',
    overview: "BigCommerce is a powerful platform with no transaction fees on any plan. It's great if you plan to grow — it handles high-volume stores without slowing down. Togogo connects via OAuth.",
    beforeYouStart: [
      'An email address',
      'Your business details (name, address)',
      'A payment method for the subscription',
    ],
    steps: [
      {
        title: 'Create your BigCommerce account',
        detail: "Go to bigcommerce.com and click 'Start your free trial'. Enter your email, store name, and answer the setup questions. BigCommerce gives you 15 days free to try it out.",
        tip: "The trial is 15 days with full features. That's plenty of time to set up and test.",
      },
      {
        title: 'Set up your store',
        detail: "BigCommerce has a setup checklist in the dashboard. Follow it step by step — add your logo, set up payments (Stripe or PayPal), configure shipping, and set your tax rules.",
        tip: "Use the built-in setup checklist. It guides you through everything.",
      },
      {
        title: 'Connect to Togogo',
        detail: "Go to Togogo Platforms page and click 'Connect' on BigCommerce. Togogo will redirect you to BigCommerce to approve the connection. Click 'Confirm' and you're connected.",
        tip: "BigCommerce connections are instant. One click and done.",
      },
    ],
    connectAction: 'bigcommerce',
  },

  wix: {
    name: 'Wix',
    color: '#0C6EFC',
    timeEstimate: '20 minutes',
    cost: '$27/month (Business plan)',
    overview: "Wix is the easiest website builder. If you've never built a website before, start here. Their AI can even design your site for you. Just answer a few questions and Wix creates a full website. Togogo connects via their app marketplace.",
    beforeYouStart: [
      'An email address',
      'A payment method for the Wix subscription',
    ],
    steps: [
      {
        title: 'Create your Wix site',
        detail: "Go to wix.com and click 'Get Started'. You can either use the Wix ADI (Artificial Design Intelligence) which asks you questions and builds a site automatically, or use the regular editor for more control. Pick the option you're comfortable with.",
        tip: "If you're not tech-savvy, use the ADI option. It literally builds the whole site for you based on your answers.",
      },
      {
        title: 'Add a store to your site',
        detail: "In the Wix editor, click 'Add Apps' in the left menu. Search for 'Wix Stores' and add it. This gives your site full ecommerce functionality — product pages, cart, checkout, the lot.",
        tip: "Wix Stores is free to add. You just need a paid Wix plan ($27/month Business) to accept payments.",
      },
      {
        title: 'Set up payments',
        detail: "Go to your Dashboard then 'Accept Payments'. Connect Wix Payments (powered by Stripe) or PayPal. Follow the on-screen steps to enter your bank details.",
        tip: "Wix Payments is the simplest option. It takes about 2 minutes to set up.",
      },
      {
        title: 'Connect to Togogo',
        detail: "Go to Togogo Platforms page and click 'Connect' on Wix. Togogo will redirect you to Wix to approve the connection. Click 'Allow' and your Wix store is connected.",
        tip: "Make sure you're logged into Wix before clicking Connect in Togogo.",
      },
    ],
    connectAction: 'wix',
  },

  prestashop: {
    name: 'PrestaShop',
    color: '#DF0067',
    timeEstimate: '2 hours',
    cost: 'Free (hosting ~$5-15/month)',
    overview: "PrestaShop is a free, open-source ecommerce platform. It's very popular in Europe and gives you complete control. It's more technical than Shopify but costs nothing for the software. You'll need your own web hosting.",
    beforeYouStart: [
      'A web host that supports PHP and MySQL (most do)',
      'Basic comfort with website admin panels',
      'A domain name (e.g., yourstore.com)',
    ],
    steps: [
      {
        title: 'Get hosting and install PrestaShop',
        detail: "Sign up with a host like Hostinger, OVH (popular in Europe), or SiteGround. Most hosts have one-click PrestaShop install in their control panel. Find it and click install. Follow the setup wizard.",
        tip: "OVH is great for European sellers. Hostinger works worldwide and is very affordable.",
      },
      {
        title: 'Configure your store',
        detail: "Log into your PrestaShop admin panel (yourdomain.com/admin). Go through the initial setup — add your store name, logo, and configure your country and currency. Set up a payment module (PayPal or Stripe) under Modules.",
        tip: "The default theme works fine to start. Focus on payments and products first.",
      },
      {
        title: 'Enable the API',
        detail: "Go to Advanced Parameters then Webservice. Turn the webservice ON. Click 'Add new webservice key'. Give it a description like 'Togogo'. Set permissions to allow Products, Orders, and Categories. Click Save and copy the API key.",
        tip: "Make sure to enable the specific permissions: Products, Orders, Categories, and Stock.",
        important: true,
      },
      {
        title: 'Connect to Togogo',
        detail: "Go to Togogo Platforms page and click 'Connect' on PrestaShop. Enter your store URL and the API key you just created. Togogo will verify the connection and you're all set.",
        tip: "Your store URL should be your domain with https:// at the start.",
      },
    ],
    connectAction: 'prestashop',
  },

  'big-cartel': {
    name: 'Big Cartel',
    color: '#222222',
    timeEstimate: '15 minutes',
    cost: 'Free (up to 5 products)',
    overview: "Big Cartel is the simplest store builder. Made for artists and makers. Their free plan lets you list up to 5 products with no monthly fee. It's incredibly easy to set up — perfect if you just want to sell a few things.",
    beforeYouStart: [
      'An email address',
      'That\'s it! Big Cartel is the easiest platform to start with.',
    ],
    steps: [
      {
        title: 'Create your Big Cartel account',
        detail: "Go to bigcartel.com and click 'Sign up'. Enter your email, shop name, and password. Pick a theme — they're all free and look great. Your store is live immediately.",
        tip: "The free plan gives you 5 products. That's enough to test the waters before committing to anything.",
      },
      {
        title: 'Set up payments',
        detail: "Go to Account then 'Checkout'. Connect Stripe or PayPal. Stripe is recommended — just enter your email and bank details. Takes about 2 minutes.",
        tip: "Stripe is the fastest to set up. You can be accepting payments in under 5 minutes.",
      },
      {
        title: 'Connect to Togogo',
        detail: "Go to Togogo Platforms page and click 'Connect' on Big Cartel. Togogo will open Big Cartel's authorization page. Click 'Authorize' and your store is connected.",
        tip: "The whole process from sign up to connected should take about 15 minutes.",
      },
    ],
    connectAction: 'bigcartel',
  },

  amazon: {
    name: 'Amazon',
    color: '#FF9900',
    timeEstimate: '1 hour',
    cost: '$39.99/month (Professional plan)',
    overview: "Amazon is the biggest online marketplace in the world. Millions of people search Amazon every day. If you want access to a massive audience, this is it. You can even use FBA (Fulfillment by Amazon) to have Amazon store and ship your products.",
    beforeYouStart: [
      'A government-issued ID (passport or driver\'s licence)',
      'A bank account and credit/debit card',
      'Your tax information (ABN for Australia, SSN/EIN for US)',
      'A phone number',
    ],
    steps: [
      {
        title: 'Create your Amazon Seller account',
        detail: "Go to sell.amazon.com (or sellercentral.amazon.com.au for Australia). Click 'Sign up'. Choose 'Professional' ($39.99/month) — it's worth it for the extra features. Enter your business info, ID, bank details, and tax info. Amazon may take 1-2 days to verify your identity.",
        tip: "Use the Professional plan even if you're just starting. The Individual plan charges $0.99 per item sold which adds up fast.",
      },
      {
        title: 'Complete identity verification',
        detail: "Amazon will ask you to upload a photo of your ID and a bank statement or utility bill for address verification. They may also do a video call to verify your identity. This is standard — they do it for all new sellers.",
        tip: "Have your documents ready before starting. It speeds up the verification process.",
      },
      {
        title: 'Set up your seller profile',
        detail: "Once verified, log into Seller Central. Complete your store profile — add your business name, logo, and a description. Set up your return policy and shipping settings.",
        tip: "A complete profile builds trust. Take 10 minutes to fill in everything.",
      },
      {
        title: 'Connect to Togogo',
        detail: "Go to Togogo Platforms page and click 'Connect' on Amazon. Togogo will redirect you to Amazon Seller Central to authorize the connection. Click 'Confirm' and Togogo will be able to list products and manage orders for you.",
        tip: "You need to be logged into Seller Central in the same browser for the connection to work.",
      },
    ],
    connectAction: 'amazon',
  },

  ebay: {
    name: 'eBay',
    color: '#E53238',
    timeEstimate: '30 minutes',
    cost: 'Free (250 free listings/month)',
    overview: "eBay has been around since 1995 and has hundreds of millions of buyers. You can sell almost anything — new or used. You get 250 free listings per month. It's one of the easiest places to start selling because the audience is already there.",
    beforeYouStart: [
      'An email address',
      'A PayPal account or bank account for payments',
      'A phone number for verification',
    ],
    steps: [
      {
        title: 'Create your eBay account',
        detail: "Go to ebay.com and click 'Register'. Create a personal account with your email. If you want to sell as a business, you can upgrade to a business account later in Account Settings.",
        tip: "Start with a personal account. You can convert to a business account anytime without losing anything.",
      },
      {
        title: 'Set up payments (Managed Payments)',
        detail: "Go to My eBay then Account then 'Payments'. eBay uses 'Managed Payments' — they pay directly to your bank account. Enter your bank details and verify your identity. eBay may ask for your ID.",
        tip: "Set this up before listing anything. You can't receive payments until Managed Payments is configured.",
      },
      {
        title: 'Create your first listing (optional)',
        detail: "To test things out, you can list an item manually. Click 'Sell' at the top of eBay. Enter a title, upload photos, set a price. This helps you understand how listings work before Togogo does it automatically.",
        tip: "You don't need to do this — Togogo can create listings for you. But it helps to understand the process.",
      },
      {
        title: 'Connect to Togogo',
        detail: "Go to Togogo Platforms page and click 'Connect' on eBay. Togogo will redirect you to eBay to authorize the connection. Sign in to eBay and click 'Agree'. Once connected, Togogo can list products and manage orders on your behalf.",
        tip: "The eBay connection lasts 18 months. Togogo will let you know when it needs to be renewed.",
      },
    ],
    connectAction: 'ebay',
  },

  etsy: {
    name: 'Etsy',
    color: '#F56400',
    timeEstimate: '30 minutes',
    cost: 'Free (20c per listing)',
    overview: "Etsy is the go-to marketplace for handmade, vintage, and creative products. It has a huge community of buyers looking for unique items. Each listing costs $0.20 and lasts 4 months. Togogo connects via Etsy's API so we can manage your listings.",
    beforeYouStart: [
      'An email address',
      'A bank account for payouts',
      'A credit/debit card for listing fees',
    ],
    steps: [
      {
        title: 'Create your Etsy shop',
        detail: "Go to etsy.com and click 'Sell on Etsy' then 'Open your Etsy shop'. Choose your shop language, country, and currency. Pick a shop name — this becomes your URL (yourshop.etsy.com). It needs to be unique.",
        tip: "Pick a shop name that describes what you sell. Short and memorable is best.",
      },
      {
        title: 'Set up your shop',
        detail: "Etsy will guide you through adding your first listing, setting up payment methods (how you pay Etsy's fees), and how you want to receive your money (bank account). Follow each step.",
        tip: "You need to create at least one listing to open your shop. You can edit or delete it later.",
      },
      {
        title: 'Set up billing',
        detail: "Under Shop Manager then Finances then 'Payment account', make sure your bank account is connected for payouts. Under 'Billing', add a credit card for Etsy's listing fees ($0.20 per listing).",
        tip: "Etsy charges $0.20 per listing plus 6.5% when you make a sale. Budget for this in your pricing.",
      },
      {
        title: 'Connect to Togogo',
        detail: "Go to Togogo Platforms page and click 'Connect' on Etsy. Togogo will redirect you to Etsy to authorize the connection. Click 'Allow access' and your Etsy shop is connected. Togogo can now create and manage listings for you.",
        tip: "The Etsy connection uses secure OAuth. Your password is never shared with Togogo.",
      },
    ],
    connectAction: 'etsy',
  },

  'tiktok-shop': {
    name: 'TikTok Shop',
    color: '#000000',
    timeEstimate: '30 minutes',
    cost: 'Free to join',
    overview: "TikTok Shop lets you sell products directly through TikTok videos and livestreams. With over a billion users, it's massive for reaching Gen Z and millennial buyers. Products can go viral overnight. Togogo connects via TikTok's seller API.",
    beforeYouStart: [
      'A TikTok account',
      'A phone number and email',
      'Business documents (varies by country)',
      'A bank account',
    ],
    steps: [
      {
        title: 'Apply for TikTok Shop seller access',
        detail: "Go to seller.tiktok.com and click 'Sign Up'. Log in with your TikTok account or create a new seller account. Choose your country and enter your business details. TikTok may take 1-3 days to review your application.",
        tip: "Individual sellers can apply too — you don't need a registered business in most countries.",
      },
      {
        title: 'Complete shop setup',
        detail: "Once approved, set up your shop name, logo, and description. Add a warehouse address (where products ship from — for dropshipping, this is your supplier's address). Set up your bank account for payouts.",
        tip: "Use a clear shop name and a good logo. TikTok Shop is very visual — first impressions matter.",
      },
      {
        title: 'Connect to Togogo',
        detail: "Go to Togogo Platforms page and click 'Connect' on TikTok Shop. Togogo will redirect you to TikTok's seller authorization page. Click 'Authorize'. Once connected, Togogo can list products to your TikTok Shop.",
        tip: "After connecting, your products show up in TikTok's product catalog. You can tag them in videos and livestreams.",
      },
    ],
    connectAction: 'tiktok',
  },

  'facebook-marketplace': {
    name: 'Facebook Marketplace',
    color: '#1877F2',
    timeEstimate: '15 minutes',
    cost: 'Free',
    overview: "Facebook Marketplace lets you sell to people near you or ship nationwide. It's completely free to list items. With billions of Facebook users, the audience is huge. Togogo connects via Meta's Commerce API.",
    beforeYouStart: [
      'A Facebook account',
      'A payment method (for shipping labels if selling shipped items)',
    ],
    steps: [
      {
        title: 'Access Facebook Marketplace',
        detail: "Open Facebook and click the Marketplace icon (the shop/storefront icon). If you don't see it, go to facebook.com/marketplace. You can start listing items immediately from your personal account.",
        tip: "Marketplace is built into Facebook. No separate sign-up needed.",
      },
      {
        title: 'Set up Commerce Manager (optional but recommended)',
        detail: "For more features, go to business.facebook.com and set up a Commerce Manager account. This lets you create a proper Facebook Shop with a product catalog, checkout, and order management. It's free.",
        tip: "Commerce Manager gives you much better tools. It's worth the 10 minutes to set up.",
      },
      {
        title: 'Connect to Togogo',
        detail: "Go to Togogo Platforms page and click 'Connect' on Facebook. Togogo will ask you to log into Facebook and authorize the connection. Select the Facebook Page or Commerce account you want to connect. Click 'Allow'.",
        tip: "You need a Facebook Page (not just a personal profile) for the business features. Creating a Page takes 2 minutes.",
      },
    ],
    connectAction: 'facebook',
  },

  depop: {
    name: 'Depop',
    color: '#FF2300',
    timeEstimate: '15 minutes',
    cost: 'Free',
    overview: "Depop is a social marketplace where fashion meets community. It's huge with Gen Z. Think of it like Instagram meets eBay for fashion, vintage, and streetwear. Everything is done through the mobile app.",
    beforeYouStart: [
      'The Depop app (download from App Store or Google Play)',
      'An email address or Apple/Google account',
      'A PayPal account or bank account for payments',
    ],
    steps: [
      {
        title: 'Download and sign up',
        detail: "Download Depop from the App Store or Google Play. Open it and create an account using your email, Apple ID, or Google account. Pick a username — this becomes your shop name.",
        tip: "Choose a memorable username. Treat it like your brand name.",
      },
      {
        title: 'Set up your shop',
        detail: "Add a profile photo and bio. Go to Settings then 'Selling' and connect PayPal or set up Depop Payments (bank account). You're now ready to sell.",
        tip: "Depop is very visual. A good profile photo and bio help build trust.",
      },
      {
        title: 'Connect to Togogo',
        detail: "Go to Togogo Platforms page and click 'Connect' on Depop. Enter your Depop API key (available in your Depop seller settings or by contacting Depop support). Togogo will verify and connect.",
        tip: "Depop's API access is more limited than other platforms. Some features may be managed manually.",
      },
    ],
    connectAction: 'depop',
  },

  'pop-up-shop': {
    name: 'Pop-Up Shop',
    color: '#9333EA',
    timeEstimate: '10 minutes in Togogo',
    cost: 'Varies by event',
    overview: "Pop-up shops let you sell in person at markets, fairs, festivals, and events. There's nothing to connect — you use Togogo to manage your inventory and process payments in person using your phone.",
    beforeYouStart: [
      'Find a local market or event to sell at',
      'A Stripe account for in-person payments (Togogo handles this)',
      'Products to sell',
    ],
    steps: [
      {
        title: 'Find events near you',
        detail: "Search for local markets, craft fairs, or pop-up events in your area. Facebook Events, Eventbrite, and local community boards are great places to find them. Many markets charge $20-$100 for a stall.",
        tip: "Start with small local markets. They're cheap, low-pressure, and great for learning what sells.",
      },
      {
        title: 'Set up Togogo for in-person sales',
        detail: "Your Togogo account can track inventory and process payments in person. Make sure you have a Stripe account connected (go to Profile then Payments). You can take payments using your phone.",
        tip: "Print QR codes for your products. Customers scan to pay — it's professional and easy.",
      },
      {
        title: 'Prepare your setup',
        detail: "Bring a table, display stands, business cards, and bags. Make sure your phone is charged. Have cash on hand for customers who don't want to pay by card.",
        tip: "A nice display makes a huge difference. Watch YouTube videos on 'market stall setup' for ideas.",
      },
    ],
    connectAction: null,
  },
}

export default function PlatformGuidePage() {
  const { platform } = useParams()
  const navigate = useNavigate()
  const [expandedStep, setExpandedStep] = useState(0)
  const { data: connectionsData } = usePlatformConnections()
  const connections = connectionsData?.connections || []

  const guide = GUIDES[platform]

  if (!guide) {
    return (
      <div className="py-6">
        <button onClick={() => navigate('/platforms')} className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Platforms
        </button>
        <div className="text-center py-16">
          <AlertCircle className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-white mb-2">Guide not found</h2>
          <p className="text-sm text-zinc-500">We don't have a guide for "{platform}" yet.</p>
        </div>
      </div>
    )
  }

  const connected = connections.some(
    (c) => c.platform === guide.connectAction && c.status === 'active'
  )

  return (
    <div className="py-6">
      {/* Back button */}
      <button
        onClick={() => navigate('/platforms')}
        className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Platforms
      </button>

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-bold"
          style={{ backgroundColor: `${guide.color}15`, color: guide.color }}
        >
          {guide.name.charAt(0)}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-heading font-bold text-white">{guide.name}</h1>
            {connected && (
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 uppercase tracking-wide">
                Connected
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">Step-by-step setup guide</p>
        </div>
      </div>

      {/* Quick info bar */}
      <div className="flex items-center gap-4 mb-6 p-3 rounded-xl bg-[#111] border border-white/[0.06]">
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <Clock className="h-3.5 w-3.5 text-[#FFD23F]" />
          <span>{guide.timeEstimate}</span>
        </div>
        <div className="h-3 w-px bg-white/[0.06]" />
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <DollarSign className="h-3.5 w-3.5 text-[#06D6A0]" />
          <span>{guide.cost}</span>
        </div>
        <div className="h-3 w-px bg-white/[0.06]" />
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <Shield className="h-3.5 w-3.5 text-[#FF6B35]" />
          <span>Secure</span>
        </div>
      </div>

      {/* Overview */}
      <div className="mb-6">
        <p className="text-sm text-zinc-400 leading-relaxed">{guide.overview}</p>
      </div>

      {/* What you'll need */}
      <div className="mb-6 p-4 rounded-xl bg-[#111] border border-white/[0.06]">
        <h3 className="text-sm font-semibold text-white mb-3">Before you start, you'll need:</h3>
        <ul className="space-y-2">
          {guide.beforeYouStart.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#FF6B35]/15 flex-shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-[#FF6B35]">{i + 1}</span>
              </div>
              <span className="text-xs text-zinc-400 leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Steps */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-white mb-4">
          Setup Steps ({guide.steps.length})
        </h3>
        <div className="space-y-2">
          {guide.steps.map((step, i) => {
            const isExpanded = expandedStep === i
            return (
              <div
                key={i}
                className={`rounded-xl border transition-all duration-300 ${
                  isExpanded
                    ? 'bg-[#111] border-[#FF6B35]/20'
                    : 'bg-[#0e0e0e] border-white/[0.06] hover:border-white/[0.12]'
                }`}
              >
                <button
                  onClick={() => setExpandedStep(isExpanded ? -1 : i)}
                  className="w-full flex items-center gap-3 p-4 text-left"
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0 text-xs font-bold transition-colors ${
                      isExpanded
                        ? 'bg-[#FF6B35] text-white'
                        : 'bg-white/[0.06] text-zinc-400'
                    }`}
                  >
                    {i + 1}
                  </div>
                  <span className={`text-sm font-medium flex-1 ${isExpanded ? 'text-white' : 'text-zinc-300'}`}>
                    {step.title}
                  </span>
                  {step.important && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 mr-2">
                      IMPORTANT
                    </span>
                  )}
                  <ChevronRight
                    className={`h-4 w-4 text-zinc-500 transition-transform duration-200 flex-shrink-0 ${
                      isExpanded ? 'rotate-90' : ''
                    }`}
                  />
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 ml-11">
                    <p className="text-xs text-zinc-400 leading-relaxed mb-3">
                      {step.detail}
                    </p>
                    {step.tip && (
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-[#FF6B35]/5 border border-[#FF6B35]/10">
                        <span className="text-xs">💡</span>
                        <p className="text-[11px] text-[#FF6B35]/80 leading-relaxed">
                          <strong className="text-[#FF6B35]">Tip:</strong> {step.tip}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Connect CTA */}
      <div className="rounded-2xl bg-gradient-to-r from-[#FF6B35]/10 to-[#FFD23F]/10 border border-[#FF6B35]/20 p-5 text-center">
        {connected ? (
          <>
            <div className="flex items-center justify-center gap-2 mb-2">
              <Check className="h-5 w-5 text-emerald-400" />
              <h3 className="text-sm font-semibold text-emerald-400">{guide.name} is connected!</h3>
            </div>
            <p className="text-xs text-zinc-500 mb-3">Togogo can now list products to your {guide.name} store.</p>
            <button
              onClick={() => navigate('/suppliers')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FF6B35] text-white text-xs font-semibold hover:bg-[#FF6B35]/90 transition-colors"
            >
              Find Products to List
            </button>
          </>
        ) : guide.connectAction ? (
          <>
            <h3 className="text-sm font-semibold text-white mb-2">Ready to connect?</h3>
            <p className="text-xs text-zinc-500 mb-3">Follow the steps above, then click below to connect.</p>
            <button
              onClick={() => navigate(`/setup?platform=${encodeURIComponent(guide.name)}`)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF6B35] text-white text-xs font-semibold hover:bg-[#FF6B35]/90 transition-colors"
            >
              <Link2 className="h-4 w-4" />
              Connect {guide.name}
            </button>
          </>
        ) : (
          <>
            <h3 className="text-sm font-semibold text-white mb-2">No connection needed!</h3>
            <p className="text-xs text-zinc-500 mb-3">{guide.name} is managed directly through Togogo.</p>
            <button
              onClick={() => navigate('/suppliers')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FF6B35] text-white text-xs font-semibold hover:bg-[#FF6B35]/90 transition-colors"
            >
              Find Products to Sell
            </button>
          </>
        )}
      </div>
    </div>
  )
}
