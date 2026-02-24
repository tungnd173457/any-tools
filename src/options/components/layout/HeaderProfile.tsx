import React from 'react';

const HeaderProfile: React.FC = () => {
    return (
        <div className="bg-white border border-gray-200 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] rounded-xl p-4 flex justify-between items-center mb-12">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-[#E11D48] rounded-full flex items-center justify-center text-white font-medium text-lg">
                    t
                </div>
                <div>
                    <div className="font-medium text-gray-800 text-sm">tùng nguyễn</div>
                    <div className="text-gray-500 text-sm">tungnd173457@gmail.com</div>
                </div>
            </div>
            <button className="px-5 py-1.5 border border-[#F3E8FF] text-[#8B5CF6] rounded-full text-sm font-medium hover:bg-[#F3E8FF] transition-colors">
                Log out
            </button>
        </div>
    );
};

export default HeaderProfile;
