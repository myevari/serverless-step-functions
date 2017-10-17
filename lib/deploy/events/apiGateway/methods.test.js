'use strict';

const expect = require('chai').expect;
const Serverless = require('serverless/lib/Serverless');
const AwsProvider = require('serverless/lib/plugins/aws/provider/awsProvider');
const ServerlessStepFunctions = require('./../../../index');

describe('#methods()', () => {
  let serverless;
  let serverlessStepFunctions;

  beforeEach(() => {
    serverless = new Serverless();
    serverless.setProvider('aws', new AwsProvider(serverless));
    serverless.service.provider.compiledCloudFormationTemplate = {
      Resources: {},
    };

    const options = {
      stage: 'dev',
      region: 'us-east-1',
    };
    serverlessStepFunctions = new ServerlessStepFunctions(serverless, options);
    serverlessStepFunctions.serverless.service.stepFunctions = {
      stateMachines: {
        first: {},
      },
    };
    serverlessStepFunctions.apiGatewayResourceLogicalIds
      = { 'foo/bar': 'apiGatewayResourceLogicalId' };
    serverlessStepFunctions.apiGatewayResourceNames
      = { 'foo/bar': 'apiGatewayResourceNames' };
    serverlessStepFunctions.pluginhttpValidated = {
      events: [
        {
          stateMachineName: 'first',
          http: {
            path: 'foo/bar',
            method: 'post',
            useIAMAuth: true,
          },
        },
      ],
    };
  });

  describe('#compileMethods()', () => {
    it('should create a method resource', () => serverlessStepFunctions
      .compileMethods().then(() => {
        expect(serverlessStepFunctions.serverless.service.provider.compiledCloudFormationTemplate
          .Resources)
        .to.have.property('ApiGatewayMethodapiGatewayResourceNamesPost');
      })
    );

    it('should set the authorization type to AWS_IAM if specified', () => serverlessStepFunctions
      .compileMethods().then(() => {
        expect(serverlessStepFunctions.serverless.service.provider.compiledCloudFormationTemplate
          .Resources.ApiGatewayMethodapiGatewayResourceNamesPost.Properties.AuthorizationType)
        .to.equal('AWS_IAM');
      })
    );
  });

  describe('#getMethodIntegration()', () => {
    it('should return a corresponding Integration resource', () => {
      expect(serverlessStepFunctions.getMethodIntegration('stateMachine').Properties)
        .to.have.property('Integration');
    });

    it('should set stateMachinelogical ID to RequestTemplates when customName is not set', () => {
      expect(serverlessStepFunctions.getMethodIntegration('stateMachine').Properties
        .Integration.RequestTemplates['application/json']['Fn::Join'][1][2].Ref)
        .to.be.equal('StateMachineStepFunctionsStateMachine');
    });

    it('should set custom stateMachinelogical ID to RequestTemplates when customName is set',
    () => {
      expect(serverlessStepFunctions.getMethodIntegration('stateMachine', 'custom').Properties
        .Integration.RequestTemplates['application/json']['Fn::Join'][1][2].Ref)
        .to.be.equal('Custom');
    });

    it('should set Access-Control-Allow-Origin header when cors is true',
    () => {
      expect(serverlessStepFunctions.getMethodIntegration('stateMachine', 'custom', {
        cors: {
          origins: ['*', 'http://example.com'],
        },
      }).Properties.Integration.IntegrationResponses[0]
      .ResponseParameters['method.response.header.Access-Control-Allow-Origin'])
      .to.equal('\'*,http://example.com\'');

      expect(serverlessStepFunctions.getMethodIntegration('stateMachine', 'custom', {
        cors: {
          origin: '*',
        },
      }).Properties.Integration.IntegrationResponses[0]
      .ResponseParameters['method.response.header.Access-Control-Allow-Origin'])
      .to.equal('\'*\'');
    });

    it('should add cognito id to the mapping template when integration type is AWS_IAM',
    () => {
      expect(serverlessStepFunctions.getMethodIntegration('stateMachine', 'custom', {
        useIAMAuth: true,
        cors: {
          origin: '*',
        },
      }).Properties.Integration.RequestTemplates['application/json']['Fn::Join'][1][1])
      .to.include('"{\\"cognitoIdentityId\\" : \\"$context.identity.cognitoIdentityId\\"');
      expect(serverlessStepFunctions.getMethodIntegration('stateMachine', 'custom', {
        useIAMAuth: true,
        cors: {
          origin: '*',
        },
      }).Properties
      .Integration.RequestTemplates['application/x-www-form-urlencoded']['Fn::Join'][1][1])
      .to.include('"{\\"cognitoIdentityId\\" : \\"$context.identity.cognitoIdentityId\\",');
    });
  });

  describe('#getMethodResponses()', () => {
    it('should return a corresponding methodResponses resource', () => {
      expect(serverlessStepFunctions.getMethodResponses().Properties)
        .to.have.property('MethodResponses');
    });

    it('should set Access-Control-Allow-Origin header when cors is true',
    () => {
      expect(serverlessStepFunctions.getMethodResponses({
        cors: {
          origins: ['*', 'http://example.com'],
        },
      }).Properties.MethodResponses[0]
      .ResponseParameters['method.response.header.Access-Control-Allow-Origin'])
      .to.equal('\'*,http://example.com\'');

      expect(serverlessStepFunctions.getMethodResponses({
        cors: {
          origin: '*',
        },
      }).Properties.MethodResponses[0]
      .ResponseParameters['method.response.header.Access-Control-Allow-Origin'])
      .to.equal('\'*\'');
    });
  });
});
