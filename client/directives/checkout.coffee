angular.module('gi.commerce').directive 'giCheckout'
, ['giCart', 'usSpinnerService', 'Address', 'giPayment', '$modal', 'giUtil',  '$q', '$timeout', 'deviceDetector', '$location'
, (Cart, Spinner, Address, Payment, $modal, Util, $q, $timeout, deviceDetector, $location) ->
  restrict : 'E',
  scope:
    model: '='
  templateUrl: 'gi.commerce.checkout.html'
  link: ($scope, element, attrs) ->
    stopSpinner = () ->
      Spinner.stop('gi-cart-spinner-1')
      $scope.isSpinnerShown = false;

    wrapSpinner =  (promise) ->
      $scope.isSpinnerShown = true;
      Spinner.spin('gi-cart-spinner-1')
      promise.then stopSpinner, stopSpinner

    fieldUsed = (prop) ->
      $scope.checkoutForm[prop].$dirty and
      $scope.checkoutForm[prop].$touched

    invokeCartPayment = () ->
      deferred = $q.defer()
      $scope.inPayment = true
      Cart.handleSubscriptionRequest().then () ->
        # retained as true to keep hiding the form cotents until the redirect
        $scope.inPayment = true
        deferred.resolve()
      , () ->
        $scope.inPayment = false
        deferred.reject()

      deferred.promise

    purchaseItems = () ->
      deferred = $q.defer()
      $scope.inPayment = true
      Cart.handleItemPurchase().then () ->
        # retained as true to keep hiding the form cotents until the redirect
        $scope.inPayment = true
        deferred.resolve()
      , () ->
        $scope.inPayment = false
        deferred.reject()

      deferred.promise

    $scope.cart = Cart
    $scope.cart.billingAddress = {}
    $scope.isSpinnerShown = false
    $scope.inPayment = false
    $scope.lastNameRegex = /(^[a-zA-Z]{2,}$)/
    $scope.isTrial = false
    $scope.pricesLoaded = false
    $scope.cartItems = $scope.cart.getItems()
    $scope.emailRegex = Util.emailRegex
    $scope.discountItemOwned = false
    $scope.itemDiscountInCart = false
    $scope.errorMessages = [];

    $timeout ( ()->
      $scope.pricesLoaded = true
    ), 1000

    setPaymentDate = () ->
      $scope.nextPaymentDate = new Date()
      if $scope.model?.me?.user?.trialUsed
        $scope.nextPaymentDate.setFullYear($scope.nextPaymentDate.getFullYear() + 1)
      else
        $scope.nextPaymentDate.setDate($scope.nextPaymentDate.getDate() + 30)

    cardElement = Payment.stripe.mountElement('#checkout-card-container', Cart)
    cardElement.on 'change', (event) ->
      if event.complete
        $scope.cart.setCardElementValidity(true)
      else
        $scope.cart.setCardElementValidity(false)

      $scope.$digest()

    $scope.$watch 'model.me', (me) ->
      if me?.user?
        setPaymentDate()
        Cart.setCustomer(me.user)
        $scope.isTrial = !me.user.trialUsed
        Address.query({ userId: me.user._id }).then (addresses) ->
          $scope.cart.addresses = addresses
      else
        $scope.isTrial = true

    $scope.$watch 'cartItems.length', () ->
      subscriptionFound = false
      itemDiscountFound = false

      for item in $scope.cartItems
        itemData = item.getData()

        if itemData.isSubscriptionItem
          subscriptionFound = true
          $scope.subscriptionItem = item

        if itemData.appliesItemDiscount
          $scope.itemDiscountInCart = true
          itemDiscountFound = true

      if !subscriptionFound
        $scope.subscriptionItem = undefined

      if !itemDiscountFound
        $scope.itemDiscountInCart = false

      processItemDiscount()

    processItemDiscount = () ->
      Cart.setItemDiscountApplied($scope.itemDiscountInCart || $scope.discountItemOwned)

    $scope.$watch 'model.assets[0].owned', () ->
      itemDiscountFound = false
      if $scope.model.assets
        for asset in $scope.model.assets
          if asset.owned && asset.appliesItemDiscount
            $scope.discountItemOwned = true
            itemDiscountFound = true

      if !itemDiscountFound
        $scope.discountItemOwned = false

      processItemDiscount()

    $scope.$watch 'model.userCountry', (newVal) ->
      if newVal?
        $scope.cart.billingAddress.country = newVal.code

    $scope.$watch 'cart.billingAddress.country', (newVal) ->
      if newVal
        wrapSpinner updateCartCountry(newVal)

    updateCartCountry = (country) ->
      Cart.setCountry(country).then () ->
        if $scope.checkoutForm.vat
          $scope.checkoutForm.vat.$validate()

    $scope.purchase = (cart) ->
      subscriptionFound = false
      for item in $scope.cartItems
        if item.getData().isSubscriptionItem
          subscriptionFound = true
          break

      if subscriptionFound
        wrapSpinner(invokeCartPayment())
      else
        wrapSpinner(purchaseItems())

    $scope.$on 'giCart:paymentFailed', (e, data) ->
      if data?
        $scope.errorMessage = data;

        if data.message?
          if data.message.raw?.message?
            $scope.errorMessage =  data.message.raw.message;
          else
            $scope.errorMessage = data.message;

        if data.raw?.message?
          $scope.errorMessage = data.raw.message;

      else
        $scope.errorMessage ='An error has occured during checkout, please check the provided information and get in touch with us.';

    $scope.$on 'giCart:paymentCompleted', (e) ->
      $scope.removeError();

    $scope.removeError = () ->
      $scope.errorMessage = "";

    $scope.showLoginForm = () ->
      $scope.navbarCollapsed = true
      if $scope.isMobile()
        $location.path('login').search('next', '/a/checkout')
      else
        $scope.showLoginModal()

    $scope.logout = () ->
      $location.path('logout')

    $scope.showLoginModal = (size) ->
      modalInstance = $modal.open(
        templateUrl: 'vfq.loginModal.html'
        controller: 'loginModalController'
        size: size
        backdrop: 'static'
        scope: $scope
        windowClass: "login-modal-window"
      )

    $scope.closeModal = (closefn) ->
      closefn()

    $scope.isMobile = () ->
      deviceDetector.isMobile()

    $scope.getCountrySorter = () ->
      topCodes = []
      if $scope.cart.getCountryCode()
        topCodes.push $scope.cart.getCountryCode()

      if not ("US" in topCodes)
        topCodes.push "US"

      if not ("GB" in topCodes)
        topCodes.push "GB"

      Util.countrySort(topCodes)

    $scope.checkValid = (country) ->
      if country
        $scope.validCountry = true

    $scope.isPropertyValidationError = (prop) ->
      errorMessage = ''
      isInvalid =
        fieldUsed(prop) and
        $scope.checkoutForm[prop].$invalid

      if isInvalid
        error = $scope.checkoutForm[prop].$error

        if prop is 'lastName'
          if $scope.checkoutForm[prop].$viewValue and ($scope.checkoutForm[prop].$viewValue).includes(' ')
            $scope.errorMessages[prop] = 'Must not include spaces'
          else
            $scope.errorMessages[prop] = 'Must include 2 letters'
        else
          $scope.errorMessages[prop] = getErrorMessage(error)

      else
        $scope.errorMessages[prop] = ''

        isInvalid

    getErrorMessage = (error) ->
      if error.required
        return "Required field"

      if error.pattern
        return "Incorrect format"

      if error.giUsername
        return "Email in use"

      if error.giPassword
        return "Must include 8 characters"

      if error.giPassword
        return "Password doesn't match"

      return "Invalid value"

    $scope.getTypeName = (item) ->
      if item._data.assetTypeId && $scope.model?.assetTypes
        for assetType in $scope.model.assetTypes
          if assetType._id == item._data.assetTypeId
            return assetType.displayName

      return "Shop Item"

    $scope.isPropertyValidationSuccess = (prop) ->
      fieldUsed(prop) and
      $scope.checkoutForm[prop].$valid and
      $scope.checkoutForm[prop].$viewValue isnt ""

    $scope.isConfirmPasswordSuccess = (prop) ->
      $scope.isPropertyValidationSuccess(prop) and
      $scope.isPropertyValidationSuccess('password')

    $scope.isUsernameTaken = () ->
      fieldUsed('email') and
      (not $scope.checkoutForm.email.$error.email) and
      (not $scope.checkoutForm.email.$error.pattern) and
      $scope.checkoutForm.email.$error.giUsername

    $scope.$watch 'checkoutForm.$valid', (valid) ->
      $scope.cart.setCheckoutFormValidity(valid)

    $scope.$watch 'checkoutForm.$pending', (pending) ->
      if pending?
        $scope.cart.setCheckoutFormValidity(false)

    $scope.$watch 'cart.business', (business) ->
      if !business and $scope.cart.company
        $scope.cart.company.VAT = null
        $scope.cart.company.name = null
        $scope.checkoutForm.vat.$setPristine()
        $scope.checkoutForm.companyName.$setPristine()

    setPaymentDate()
]
