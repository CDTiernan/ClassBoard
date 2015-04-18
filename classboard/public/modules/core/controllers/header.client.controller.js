'use strict';

angular.module('core').controller('HeaderController', ['$scope', '$http', '$location', 'Authentication', '$modal', '$log',
	function($scope, $http, $location, Authentication, $modal, $log) {
		$scope.authentication = Authentication;
		if(Authentication.user.classes!==0){
				$http.post('/course/courseByID', $scope.authentication).success(function(response) {
					// set the global user.classes to the response containing course objects
					$scope.authentication.user.classes = response;
					console.log($scope.authentication.user.classes);
				}).error(function(response) {
					$scope.SignUp.error = response.message;
				});
		}

		// Opens a modal window
		$scope.open = function (size, currentUser) {

	    var modalInstance = $modal.open({
	      templateUrl: 'modules/core/views/settings.client.view.html',
	      //controller: function ($scope, $modalInstance, user) {
				//	$scope.user = user;
				//},
	      size: size,
	      resolve: {
	        items: function () {
	          return currentUser;
	        }
	      }
	    });
		};
		//templateUrl: 'modules/core/views/settings.client.view.html',

		$scope.logOut = function() {
			$http.get('/auth/signout').success(function(response){
				$scope.authentication.user = null;
				$location.path('/signin');
			});
		};

		$scope.isActive = function(viewLocation) {
    	return viewLocation === $location.path();
		};



		$scope.get_class_id_from_url_for_settings = function() {
			//console.log('path: ' + $location.url().split('/')[2]);
			return 	$location.url().split('/')[2];
		};
	}
]);
