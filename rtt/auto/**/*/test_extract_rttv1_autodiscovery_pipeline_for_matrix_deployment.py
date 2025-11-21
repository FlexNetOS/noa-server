"""
Unit tests for Extract RTT-v1 Auto-Discovery Pipeline for Matrix Deployment
"""

import unittest
from . import ExtractRttv1AutodiscoveryPipelineForMatrixDeployment


class TestExtractRttv1AutodiscoveryPipelineForMatrixDeployment(unittest.TestCase):

    def setUp(self):
        self.component = ExtractRttv1AutodiscoveryPipelineForMatrixDeployment()

    def test_initialization(self):
        result = self.component.initialize()
        self.assertTrue(result)
        self.assertTrue(self.component.validate())

    def test_execution(self):
        self.component.initialize()
        # TODO: Add execution tests
        pass

    def tearDown(self):
        self.component.cleanup()


if __name__ == '__main__':
    unittest.main()
