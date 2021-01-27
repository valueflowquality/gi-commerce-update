angular.module('gi.commerce').provider 'giCart', () ->
  thankyouDirective = ""

  @setThankyouDirective = (d) ->
    thankyouDirective = d

  @$get = ['$q', '$rootScope', '$http', 'giCartItem', 'giLocalStorage'
  , 'giCountry', 'giCurrency', 'giPayment', 'giMarket', 'giUtil', '$window', 'giEcommerceAnalytics', 'giDiscountCode'
  , '$injector', '$timeout', ($q, $rootScope, $http, giCartItem, store, Country, Currency, Payment
  , Market, Util, $window, giEcommerceAnalytics, Discount, $injector, $timeout) ->
    cart = {}

    getPricingInfo = () ->
      marketCode: cart.market.code
      taxRate: cart.tax
      taxInclusive: cart.taxInclusive
      taxExempt: cart.taxExempt
      coupon: cart.coupon
      itemDiscountApplied: cart.itemDiscountApplied

    getItemById = (itemId) ->
      build = null
      angular.forEach cart.items,  (item) ->
        if item.getId() is itemId
          build = item
      build

    getSubTotal = (isTrial, ignoreDiscount) ->
      subTotal = 0
      priceInfo = getPricingInfo()
      priceInfo.isTrial = isTrial
      angular.forEach cart.items, (item) ->
        subTotal += item.getSubTotal(priceInfo, ignoreDiscount)

      +(subTotal).toFixed(2)

    getTaxTotal = (isTrial, ignoreDiscount) ->
      taxTotal = 0
      priceInfo = getPricingInfo()
      priceInfo.isTrial = isTrial
      angular.forEach cart.items, (item) ->
        taxTotal += item.getTaxTotal(priceInfo, ignoreDiscount)
      taxSavings = taxTotal  *  (cart.discountPercent / 100)
      taxTotal = taxTotal - taxSavings
      +(taxTotal).toFixed(2)


    init = () ->
      cart =
        tax : null
        taxName: ""
        taxExempt: false
        items : []
        stage: 1
        paymentType: 1
        validStages: {}
        isValid: true
        country:
          code: 'GB'
        currency:
          code: 'GBP'
          symbol: '£'
        market:
          code: 'UK'
        company: {}
        taxInclusive: true
        taxApplicable: false
        discountPercent: 0
        coupon:
          percent_off: 0
          amount_off: 0
          valid: false
        checkoutFormValid: false
        cardElementValid: undefined
        business: false
        isLocalBusiness: false
        itemDiscountApplied: false
      return

    save = () ->
      store.set 'cart', cart



    calculateTaxRate = (code, removedVat) ->
      vatNumber = code or c.company?.VAT
      deferred = $q.defer()
      countryCode = cart.country.code
      uri = '/api/taxRate?countryCode=' + countryCode

      $http.get(uri).success (data) ->
        cart.tax = data.rate
        cart.taxName = data.name
        cart.taxApplicable = (data.rate > 0)
        cart.taxExempt = false
        cart.isLocalBusiness = false

        if (cart.tax > 0) and vatNumber and !removedVat
          exp = Util.vatRegex
          match = exp.exec(vatNumber)
          if match?
            if cart.country.code == "IE" && match[1] == "IE"
              cart.isLocalBusiness = true
              deferred.resolve data
              return
            uri = '/api/taxRate?countryCode=' + countryCode
            uri += '&vatNumber=' + match[0]

          if c.billingAddress?.code?
            uri += '&postalCode=' + c.billingAddress.code

          $http.get(uri).success (exemptionData) ->
            cart.taxExempt = data.name? and (exemptionData.rate is 0)
            deferred.resolve exemptionData
          .error (err) ->
            deferred.resolve data
        else
          deferred.resolve data

      .error (err) ->
        console.log 'error getting tax rate'
        cart.tax = -1
        cart.taxName = ""
        cart.taxExempt = false
        cart.taxApplicable = false
        deferred.reject err

      deferred.promise

    # Below are the publicly exported functions
    c =
      init: init

      checkCode: (code) ->
        deferred = $q.defer()
        cart.discountPercent = 0
        if code? and code isnt ''
          uri = '/api/discountCodes/my/' + code
          $http.get(uri).success( (data, status) ->
            if data?
              cart.discountPercent = data.percent
            deferred.resolve(cart.discountPercent)
          ).error (data) ->
            deferred.reject 'Could not check code'
        else
          deferred.reject 'No code supplied'
        deferred.promise



      addItem: (id, name, priceList, quantity, data) ->

        inCart = getItemById(id)

        if angular.isObject(inCart)
          #Update quantity of an item if it's already in the cart
          inCart.setQuantity(quantity, false)
        else
          newItem = new giCartItem(id, name, priceList, quantity, data)
          cart.items.push(newItem)
          giEcommerceAnalytics.addToCart(newItem)
          $rootScope.$broadcast('giCart:itemAdded', newItem)

        $rootScope.$broadcast('giCart:change', {})

      setTaxRate: (tax) ->
        cart.tax = tax

      getTaxRate: () ->
        if cart.tax >= 0
          cart.tax
        else
          -1

      isTaxApplicable: () ->
        cart.taxApplicable

      getDiscount: () ->
        cart.discountPercent

      isTaxExempt: () ->
        cart.taxExempt

      isLocalBusiness: () ->
        cart.isLocalBusiness

      taxName: () ->
        cart.taxName

      setTaxInclusive: (isInclusive) ->
        cart.taxInclusive = isInclusive

      getSubTotal: getSubTotal

      getTaxTotal: getTaxTotal


      getItems: () ->
        cart.items

      getStage: () ->
        cart.stage

      nextStage: () ->
        if cart.stage < 4
          cart.stage += 1

      prevStage: () ->
        if cart.stage > 1
          cart.stage -= 1

      setStage: (stage) ->
        if stage > 0 and stage < 4
          cart.stage = stage

      getPaymentType: () ->
        return cart.paymentType

      setPaymentType: (paymentType) ->
        cart.paymentType = paymentType

      setStageValidity: (stage, valid) ->
        cart.validStages[stage] = valid

      setValidity: (valid) ->
        cart.isValid = valid

      setCheckoutFormValidity: (valid) ->
        cart.checkoutFormValid = valid

      setCardElementValidity: (valid) ->
        cart.cardElementValid = valid

      setCoupon: (coupon) ->
        cart.coupon = coupon

      setDefaultCoupon: () ->
        cart.coupon = { percent_off: 0, amount_off: 0, valid: false }

      isCouponValid: () ->
        cart.coupon.valid

      getCouponDuration: () ->
        cart.coupon.duration

      getCouponDurationMonths: () ->
        cart.coupon.duration_in_months

      getCouponDuration: () ->
        cart.itemDiscountApplied

      setItemDiscountApplied: (applied) ->
        cart.itemDiscountApplied = applied

      isStageInvalid: (stage) ->
        if cart.validStages[stage]?
          not (cart.isValid and cart.validStages[stage])
        else
          not cart.isValid

      isCheckoutFormInvalid: () ->
        not cart.checkoutFormValid || not cart.cardElementValid

      isCardElementFormValid: () ->
        cart.cardElementValid

      getCurrencySymbol: () ->
        cart.currency.symbol

      getCurrencyCode: () ->
        cart.currency.code

      getCountryCode: () ->
        cart.country.code

      getPricingInfo: getPricingInfo

      setCustomer: (customer) ->
        @customer = customer

      getLastPurchase: () ->
        cart.lastPurchase

      thankyouDirective: thankyouDirective

      setCountry: (code) ->
        Currency.all().then () ->
          Market.all()
          .then (markets) ->
            Country.getFromCode(code)
            .then (country) ->
              if country?
                cart.country = country
                cart.market = Market.getCached(cart.country.marketId)
                cart.currency = Currency.getCached(cart.market.currencyId)
                calculateTaxRate()

      calculateTaxRate: calculateTaxRate

      needsShipping: () ->
        result = false
        angular.forEach cart.items, (item) ->
          if item.needsShipping()
            result = true
        result

      totalItems: () ->
        cart.items.length

      totalQuantity: () ->
        result = 0
        angular.forEach cart.items, (item) ->
          result += item._quantity

        result

      totalCost:  (isTrial, ignoreDiscount) ->
        total = BigNumber(0)
        priceInfo = getPricingInfo()
        priceInfo.isTrial = isTrial
        angular.forEach cart.items, (item) ->
          total = total.plus(item.getTotal(priceInfo, ignoreDiscount))
        +total.toFixed(2)

      discount: () ->
        cart.savings

      hasDiscount: () ->
        if cart.savings
          return true
        else
          return false

      removeItem: (index) ->
        cart.items.splice index, 1
        $rootScope.$broadcast 'giCart:itemRemoved', {}
        $rootScope.$broadcast 'giCart:change', {}

      continueShopping: () ->
        $window.history.back()

      stopSpinner: () ->
        $injector.get('usSpinnerService').stop('gi-cart-spinner-1')
        @setValidity true

      wrapSpinner: () ->
        @setValidity false
        $injector.get('usSpinnerService').spin('gi-cart-spinner-1')

      checkAccount: () ->
        that = @
        onPreparePayment = () ->
          that.wrapSpinner()
          that.preparePayment(cart, (client_secret) ->
            cart.client_secret = client_secret
            cart.stage += 1
            that.stopSpinner()
          )

        onSubmitInvoice = () ->
          that.wrapSpinner()
          that.submitInvoice(cart)

        if @customerInfo and (not @customer)
          $rootScope.$on 'event:auth-login-complete', (e, me) ->
            console.log('event:auth-login-complete: ', e)
            that.setCustomer(me)
            if cart.paymentType == 2
              onSubmitInvoice()
            else
              onPreparePayment()
          $rootScope.$broadcast('giCart:accountRequired', @customerInfo)

        if @customerInfo and @customer
          if cart.paymentType == 2
            onSubmitInvoice()
          else
            onPreparePayment()

      handleSubscriptionRequest: () ->
        that = @
        deferred = $q.defer()

        that.submitUserInfo().then(
          () ->
            that.subscribeNow().then(
              () ->
                deferred.resolve()
              , (subscriptionErr) ->
                deferred.reject(subscriptionErr)
            )
          , (registrationErr) ->
            deferred.reject(registrationErr)
        )

        deferred.promise

      handleItemPurchase: () ->
        that = @
        deferred = $q.defer()

        that.submitUserInfo().then () ->
          that.preparePayment(cart, (client_secret) ->
            if client_secret
              cart.client_secret = client_secret
              that.payNow().then () ->
                deferred.resolve()
              , (err) ->
                deferred.reject(err)
            else
              deferred.reject()
          )
        , (err) ->
          deferred.reject(err)

        deferred.promise

      submitUserInfo: () ->
        that = @
        deferred = $q.defer()
        userRegistrationRequired = false

        if @customerInfo and (not @customer)
          userRegistrationRequired = true
          $rootScope.$on 'event:auth-login-complete', (e, me) ->
            that.setCustomer(me)
            deferred.resolve()
          registrationObject = Object.assign({}, @customerInfo)

          if @billingAddress.country
            registrationObject.countryCode = @billingAddress.country

          $rootScope.$broadcast('giCart:accountRequired', registrationObject)

        if !userRegistrationRequired
          deferred.resolve()

        deferred.promise

      saveCardElement: (el) ->
        cart.cardElement = el

      getCardElement: () ->
        cart.cardElement

      payNow: () ->
        that = @
        deferred = $q.defer()
        if cart.client_secret and cart.cardElement
          stripeIns = Payment.stripe.getStripeInstance()
          stripeIns.handleCardPayment(
            cart.client_secret,
            cart.cardElement
          ).then( (result) ->
            if result.paymentIntent
              $rootScope.$broadcast('giCart:paymentCompleted')
              giEcommerceAnalytics.sendTransaction({ option: 'Transaction Complete'}, cart.items, cart.market.code, cart.currency.code)
              assetIds = [item._data._id] for item in cart.items
              that.waitForAssets(assetIds).then () ->
                that.empty()
                that.redirectUser()
                deferred.resolve()
              , (err) ->
                that.empty()
                $rootScope.$broadcast('giCart:paymentFailed', "An error occurred with the automatic redirect, please open the welcome page manually.")
                deferred.reject()
            else
              if result.error
                $rootScope.$broadcast('giCart:paymentFailed', result.error)
              deferred.reject()
          )
        deferred.promise

      subscribeNow: () ->
        that = @
        deferred = $q.defer()
        if that.customer and cart.cardElement
          stripeIns = Payment.stripe.getStripeInstance()
          stripeIns.createPaymentMethod(
            type: 'card',
            card: cart.cardElement,
            billing_details: {
              email: that.customer.email
            }
          ).then (result) ->
            if result.paymentMethod
              that.submitSubscriptionRequest(result.paymentMethod).then( () ->
                $rootScope.$broadcast('giCart:paymentCompleted')
                giEcommerceAnalytics.sendTransaction({ step: 4, option: 'Transaction Complete'}, cart.items, cart.market.code, cart.currency.code)
                # TODO: make it wait for all assets involved
                assetIds = [item._data._id] for item in cart.items
                that.waitForAssets(assetIds).then(
                  () ->
                    that.empty()
                    that.redirectUser()
                    deferred.resolve()
                  , (err) ->
                    that.empty()
                    $rootScope.$broadcast('giCart:paymentFailed', "An error occurred with the automatic redirect, please open the welcome page manually.")
                    deferred.reject()
                )
              , (data) ->
                $rootScope.$broadcast('giCart:paymentFailed', data)
                deferred.reject()
              )
            else
              if result.error
                $rootScope.$broadcast('giCart:paymentFailed', result.error)
              deferred.reject()
          .catch () ->
            deferred.reject()
        else
          deferred.reject()
        deferred.promise

      submitSubscriptionRequest: (paymentMethod) ->
        that = @
        stripeIns = Payment.stripe.getStripeInstance()
        deferred = $q.defer()
        subscriptionRequest =
          marketCode: cart.market.code
          customer: that.customer
          paymentMethod: paymentMethod.id
          total: that.totalCost(),
          billing: that.billingAddress
          customer: that.customer
          currency: that.getCurrencyCode().toLowerCase()
          couponCode: that.couponCode
          tax:
            rate: cart.tax
            name: cart.taxName
          items: ({id: item._data._id, name: item._data.name, purchaseType: item._data.purchaseType}) for item in cart.items

        if that.business
          subscriptionRequest.business = that.business
          subscriptionRequest.vat = that.company.VAT
          subscriptionRequest.company = that.company.name

        $http.post('/api/createSubscription', subscriptionRequest)
        .success (subscription) ->
          latestInvoice = subscription.latest_invoice
          paymentIntent = latestInvoice.payment_intent

          if paymentIntent
            clientSecret = paymentIntent.client_secret
            status = paymentIntent.status

            if (status == 'requires_action')
              stripeIns.confirmCardPayment(clientSecret).then( (result) ->
                if result.error
                  $http.put("/api/cancel-subscription").then () ->
                    deferred.reject "The card payment was rejected during confirmation"
                  , (err) ->
                      console.dir err

                      subscriptionErrorMessage = "The card payment was rejected during confirmation and the incomplete subscription could not be cancelled automatically.
                        Please get in touch with support via the chat or email, or cancel so manually in the My Account page."

                      subscriptionErrorMessageError = ''

                      if err.data
                        subscriptionErrorMessageError = ' Details for the error that should be passed to support, if needed: ' + err.data

                      if err.msg
                        subscriptionErrorMessageError = ' Details for the error that should be passed to support, if needed: ' + err.msg

                      if err.message
                        subscriptionErrorMessageError = ' Details for the error that should be passed to support, if needed: ' + err.message

                      if err.statusText
                        subscriptionErrorMessageError = ' Details for the error that should be passed to support, if needed: ' + err.statusText

                      if subscriptionErrorMessageError
                        subscriptionErrorMessage += subscriptionErrorMessageError

                      deferred.reject subscriptionErrorMessage
                else
                  deferred.resolve()
              )
            else
              deferred.resolve()
          else
            deferred.resolve()

        .error (data) ->
          deferred.reject data

        deferred.promise

      waitForAssets: (assetIds) ->
        # TODO: Rewrite so that the not just subscriptions, but all items can be waited on and it works in case we don't have a subscription
        that = @
        deferred = $q.defer()
        hasSubscription = false

        if assetIds.length == 0
          console.log "No assets to wait for"
          deferred.resolve()
        else
          that.requestUserAssetInfo(assetIds).then(
            (response) ->
              if response.data
                deferred.resolve()
              else
                $timeout ( ()->
                  that.waitForAssets(assetIds).then( () ->
                    deferred.resolve()
                  , (err)->
                    deferred.reject(err)
                  )
                ), 2000
            , (err) ->
              deferred.reject(err)
          )

        deferred.promise

      requestUserAssetInfo: (assetIds) ->
        url = '/api/assets/are-owned'
        firstAsset = true

        for assetId in assetIds
          if firstAsset
            url += "?assetIds[]=" + assetId
          else
            url += "&assetIds[]=" + assetId

        return $http.get(url)

      redirectUser: () ->
        $window.location.href = "/welcome"

      preparePayment: (cart, callback) ->
        that = @
        chargeRequest =
          marketCode: cart.market.code
          total: that.totalCost()
          billing: that.billingAddress
          shipping: that.shippingAddress
          customer: that.customer
          currency: that.getCurrencyCode().toLowerCase()
          tax:
            rate: cart.tax
            name: cart.taxName
          items: ({id: item._data._id, name: item._data.name, purchaseType: item._data.purchaseType}) for item in cart.items

        if that.business
          chargeRequest.business = that.business
          chargeRequest.vat = that.company.VAT
          chargeRequest.company = that.company.name

        if that.company?
          chargeRequest.company = that.company
          exp = Util.vatRegex
          match = exp.exec(that.company.VAT)
          if match?
            uri = '/api/taxRate?countryCode=' + match[1]
            uri += '&vatNumber=' + match[0]
            $http.get(uri).success (exemptionData) ->
              chargeRequest.tax.rate = exemptionData?.rate or 0
              chargeRequest.tax.name = exemptionData?.name
              that.makeIntent(chargeRequest, that, callback)
            .error (err) ->
              $rootScope.$broadcast('giCart:paymentFailed', err)
          else
            that.makeIntent(chargeRequest, that, callback)
        else
          that.makeIntent(chargeRequest, that, callback)

      submitInvoice: (cart, callback) ->
        that = @
        chargeRequest =
          total: that.totalCost()
          billing: that.billingAddress
          shipping: that.shippingAddress
          customer: that.customer
          currency: that.getCurrencyCode().toLowerCase()
          tax:
            rate: cart.tax
            name: cart.taxName
          items: ({id: item._data._id, name: item._data.name, purchaseType: item._data.purchaseType}) for item in cart.items

        if that.company?
          chargeRequest.company = that.company
          exp = Util.vatRegex
          match = exp.exec(that.company.VAT)
          if match?
            uri = '/api/taxRate?countryCode=' + match[1]
            uri += '&vatNumber=' + match[0]
            $http.get(uri).success (exemptionData) ->
              chargeRequest.tax.rate = exemptionData?.rate or 0
              chargeRequest.tax.name = exemptionData?.name
            .error (err) ->
              $rootScope.$broadcast('giCart:paymentFailed', err)
              return

        $http.post('/api/submitInvoice', chargeRequest)
        .success () ->
          that.empty()
          cart.stage += 2
          that.stopSpinner()
        .error (data) ->
          msg = 'Invoice submission could not completed'
          if data.message?
            msg = data.message
          $rootScope.$broadcast('giCart:paymentFailed', msg)
          that.stopSpinner()

      makeIntent: (chargeRequest, that, callback) ->
        Payment.stripe.createIntent(chargeRequest).then (client_secret) ->
          $rootScope.$broadcast('giCart:paymentPrepared')
          ##giEcommerceAnalytics.sendTransaction({ step: 4, option: 'Transaction Complete'}, cart.items)
          callback(client_secret)
        , (err) ->
          $rootScope.$broadcast('giCart:paymentFailed', err)
          callback()

      makeCharge: (chargeRequest, that) ->
        Payment.stripe.charge(chargeRequest).then (result) ->
          $rootScope.$broadcast('giCart:paymentCompleted')
          giEcommerceAnalytics.sendTransaction({ step: 4, option: 'Transaction Complete'}, cart.items, cart.market.code, cart.currency.code)
          that.empty()
          cart.stage = 4
        , (err) ->
          $rootScope.$broadcast('giCart:paymentFailed', err)


      empty: () ->
        @billingAddress = {}
        @shippingAddress = {}
        @customerInfo = {}
        @card = {}
        @company = {}
        cart.lastPurchase = cart.items.slice 0
        cart.items = []
        localStorage.removeItem 'cart'

      save: save


      sendCart: (opt) ->
        giEcommerceAnalytics.sendCartView({ option: opt }, cart.items)

      sendCheckOut: () ->
        giEcommerceAnalytics.checkOut(cart.items)

      restore: (storedCart) ->
        init()
        cart.tax = storedCart.tax

        angular.forEach storedCart.items, (item) ->
          cart.items.push(new giCartItem(
            item._id,  item._name, item._priceList, item._quantity, item._data)
          )

        save()
    c
  ]

  @
