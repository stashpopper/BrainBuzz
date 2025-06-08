import React from 'react'
import useAuthStore from './Store'
import { useNavigate } from 'react-router-dom'
const Next = () => {
    const navigate = useNavigate();
    const { stepsItems, currentStep, setCurrentStep, nextStep, prevStep } = useAuthStore();

    return (
        <div className='flex justify-between'>
            <button className='w-17 px-4 py-2 text-white font-medium bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-600 rounded-lg duration-150' onClick={prevStep} disabled={currentStep === 1}> Prev </button>
            <button className="w-17 px-4 py-2 text-white font-medium bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-600 rounded-lg duration-150" onClick={ currentStep === stepsItems.length? ()=>navigate('/quiz'): nextStep}>
                Next
            </button>
        </div>
    )
}

export default Next