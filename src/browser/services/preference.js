"use strict";

let _individualTransformationMode = false;

export const setIndividualTransformationMode = (mode) => _individualTransformationMode = mode;

export const getIndividualTransformationMode = () => _individualTransformationMode;