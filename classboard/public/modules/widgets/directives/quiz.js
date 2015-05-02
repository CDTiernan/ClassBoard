'use strict';

angular.module('widgets').directive('quiz', ['Authentication','$http', '$state', '$timeout', 'Socket', '$modal', '$log', '$interval',
function(Authentication, $http, $state, $timeout, Socket, $modal, $log, $interval) {
	
	function link($scope, element, attrs) {
		$scope.questions = [];
		$scope.activeQuestion = undefined;
		$scope.QuestionModel = {};
		$scope.authentication = Authentication;
		$scope.hasAnswered = false;
		
		
		
		Socket.on('question active', function() {
			$scope.turnOffTimeUpdater();
			$scope.getQuestions();
			$scope.getActiveQuestion();
		});
		
		Socket.on('update question', function() {
			$scope.turnOffTimeUpdater();
			$interval.cancel($scope.activeQuestion.timeUpdater);
			$scope.getActiveQuestion();
		});
		
		
		$scope.updateRemainingTime = function() {
			if ($scope.activeQuestion.remainingTime < 1) {
				$interval.cancel($scope.activeQuestion.timeUpdater);
				$scope.activeQuestion = undefined;
			}
			else {
				var endTimeMs =  (new Date($scope.activeQuestion.startTime)).getTime() + $scope.activeQuestion.duration * 1000;
				$scope.activeQuestion.remainingTime = Math.floor((endTimeMs - Date.now()) / 1000);
			}
		};
		
		
		
		
		
		$scope.getActiveQuestion = function () {
			$http.get('/widget/quiz/questions/' + $state.params._id)
			.success(function(question) {
				if(!$scope.isAdmin()) {
					delete question.answer;
				}
				if (question) {
					$scope.activeQuestion = question;
					$scope.updateRemainingTime();
					$scope.activeQuestion.timeUpdater = $interval($scope.updateRemainingTime, 1000);
					
					
					if(!$scope.isAdmin()) {
						// try to get answer if student
						$http.post('/widget/quiz/getAnswer', question)
						.success(function(answer) {
							console.log('GOT ANSWER');
							$scope.hasAnswered = true;
						})
						.error(function(err) {
							console.log(err);
						});
					}
				}
			})
			.error(function(err) {
				console.log(err);
			});
		};
		
		
		$scope.getActiveQuestion();
		
		
		
		
		$scope.closeQuestion = function() {
			if(!activeQuestion) {
				console.log('cannot close non-active question');
			}
			else {
				$http.post('/widget/quiz/close',	{questionId: activeQuestion._id})
				.success(function(res) {
					console.log('YAY CLOSED');
					//Socket.emit('STUFF');
					
					
				})
				.error(function(err) {
					console.log('close error');
					console.log(err);
				});
			}
			
		}
		
		
		$scope.getLetter = function(num) {
			var a = 'a'.charCodeAt(0);
			return String.fromCharCode(a + num);
		};
		
		$scope.toggle = function() {
			$scope.creatingQuestion = !$scope.creatingQuestion;
		};
		
		$scope.getQuestions = function() {
			$http.post('/widget/quiz/questions', {courseId: $state.params._id})
			.success(function(res) {
				$scope.questions = res;
			})
			.error(function(err) {
				$scope.QuestionModel.error = err.message;
			});
		};
		
		
		
		$scope.submitAnswer = function() {
			$scope.activeQuestion.error = undefined;
			$http.post('/widget/quiz/answer', 
			{
				text: $scope.activeQuestion.answer,
				course: $state.params._id,
				question: $scope.activeQuestion._id
			})
			.success(function(res) {
				$scope.hasAnswered = true;
				Socket.emit('question answered');
				
				console.log(res);
			})
			.error(function(err) {
				$scope.activeQuestion.error = err;
			});
		};
		
		$scope.turnOffTimeUpdater = function() {
			if($scope.activeQuestion && $scope.activeQuestion.timeUpdater) {
				$interval.cancel($scope.activeQuestion.timeUpdater);
				// active question set to undefined here?
			}
		}
		
		$scope.startQuestion = function(question) {
			
			$http.post('/widget/quiz/updateStartTime', {courseId: $state.params._id, questionId: question._id, duration: question.duration})
			.success(function(res) {
				console.log('CLIENT SENDS START QUESTION');
				Socket.emit('start question');
			})
			.error(function(err) {
				console.log('ERRRRRRRRROORRRRR');
				$scope.QuestionModel.error = err.message;
			});
		};
		
		/**
		* Modal Stuff
		*/
		
		// Opens a modal window
		$scope.open = function (size, element, attrs,currentUser) {
			var modalInstance = $modal.open({
				templateUrl: 'modules/widgets/views/newQuestion.client.view.html',
				controller: function ($scope, $modalInstance, user) {
					$scope.user = user;
					$scope.SaveAndExit = {};
					
					$scope.creatingQuestion = false;
					$scope.questions = [];
					$scope.QuestionModel = {mcAnswers : [''], mcAnswer : 'n/a', tfAnswer : '', orAnswer: ''};
					$scope.submit = function() {
						$scope.QuestionModel.error = '';
						var SubmitModel = {};
						switch ($scope.QuestionModel.type) {
							case 'TF':
							SubmitModel.type = 'TF';
							SubmitModel.answer = $scope.QuestionModel.tfAnswer;
							break;
							case 'MC':
							SubmitModel.answer = $scope.QuestionModel.mcAnswer;
							SubmitModel.mcAnswers = $scope.QuestionModel.mcAnswers;
							SubmitModel.type = 'MC';
							break;
							case 'OR':
							SubmitModel.answer = $scope.QuestionModel.orAnswer;
							SubmitModel.type = 'OR';
							break;
							default:
							$scope.QuestionModel.error = 'Must select a type';
							return;
						}
						
						SubmitModel.courseId = $state.params._id;
						SubmitModel.text = $scope.QuestionModel.text;
						SubmitModel.course = $state.params._id;
						
						$http.post('/widget/quiz/create', SubmitModel)
						.success(function(res) {})
						.error(function(err) {
							$scope.QuestionModel.error = err.message;
						});
						
					};
					
					$scope.getLetter = function(num) {
						var a = 'a'.charCodeAt(0);
						return String.fromCharCode(a + num);
					};
					
					$scope.submitToggle = function(){
						$scope.submit();
						$scope.QuestionModel = {mcAnswers : [''], mcAnswer : 'Correct Answer', tfAnswer : '', orAnswer: ''};
						//$scope.getQuestions();
						//$scope.toggle();
						$modalInstance.close(user);
					};
				},
				size: size,
				resolve: {
					user: function () {
						return currentUser;
					}
				}
			});
			
			modalInstance.result.then(function(res) {
				$scope.getQuestions();
			}, function() {
				console.log('modal dismissed');
			});
			
		};
		// modal end
		//get questions when element first gets loaded
		$scope.getQuestions();
		//need to remove update timer $interval so that it doens't mem leak
		element.on('$destroy', function() {
			if ($scope.activeQuestion) {
				$interval.cancel($scope.activeQuestion.timeUpdater);
			}
		});
		
		
		
		
		
		
		
		
		
	}
	return {
		restrict: 'E',
		link: link,
		templateUrl: '/modules/widgets/views/quiz.html',
	};
}]);
