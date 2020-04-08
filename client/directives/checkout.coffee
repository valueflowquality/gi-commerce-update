angular.module('gi.commerce').directive 'giCheckout'
, ['giCart', 'usSpinnerService', 'Address', 'giPayment', '$modal', 'giUtil',  '$q'
, (Cart, Spinner, Address, Payment, $modal, Util, $q) ->
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

    $scope.pageReady = true
    $scope.cart = Cart
    $scope.isSpinnerShown = false
    $scope.inPayment = false
    $scope.lastNameRegex = /(^[a-zA-Z]{2,}$)/

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
        Address.query({ userId: me.user._id }).then (addresses) ->
          $scope.cart.addresses = addresses        

    $scope.$watch 'model.userCountry', (newVal) ->
      if newVal?
        wrapSpinner Cart.setCountry(newVal.code)

    $scope.subscribeNow = () ->
      wrapSpinner(invokeCartPayment())
    
    $scope.$on 'giCart:paymentFailed', (e, data) ->
      if data?
        $scope.errorMessage = data;

        if data.message?
          $scope.errorMessage = data.message;

        if data.raw?.message?
          $scope.errorMessage = data.raw.message;

      else
        $scope.errorMessage ='An error has occured during checkout, please check the provided information and get in touch with us.';

    $scope.$on 'giCart:paymentCompleted', (e) ->
      $scope.removeError();

    $scope.removeError = () ->
      $scope.errorMessage = "";

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

    $scope.isPropertyValidationError = (prop, needsMessage) ->
      errorMessage = ''
      isInvalid =
        fieldUsed(prop) and
        $scope.checkoutForm[prop].$invalid

      if isInvalid
        if prop is 'lastName'
          if $scope.checkoutForm[prop].$viewValue and ($scope.checkoutForm[prop].$viewValue).includes(' ')
            errorMessage = 'Field must not include spaces.'
          else
            errorMessage = 'Field must be at least 2 latin letters without numbers.'
        else
          errorMessage = "Field isn't not filled correctly."
      if needsMessage
        errorMessage
      else
        isInvalid

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

    setPaymentDate()
]
